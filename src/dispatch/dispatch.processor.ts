import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { TripAssignmentStatus, TripStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TripGatewayService } from '../trip-gateway/trip-gateway.service';
import { ExpoPushService } from '../notifications/expo-push.service';
import { DISPATCH_QUEUE } from '../queue/queue.module';
import {
	DispatchService,
	OfferTripJobData,
	DispatchTimeoutJobData,
	MAX_DISPATCH_ATTEMPTS,
	DISPATCH_TIMEOUT_MS,
} from './dispatch.service';

@Processor(DISPATCH_QUEUE)
@Injectable()
export class DispatchProcessor extends WorkerHost {
	private readonly logger = new Logger(DispatchProcessor.name);

	constructor(
		private prisma: PrismaService,
		private tripGateway: TripGatewayService,
		private expoPush: ExpoPushService,
		private dispatchService: DispatchService,
	) {
		super();
	}

	async process(
		job: Job<OfferTripJobData | DispatchTimeoutJobData>,
	): Promise<void> {
		switch (job.name) {
			case 'offer-trip':
				return this.handleOfferTrip(job as Job<OfferTripJobData>);
			case 'dispatch-timeout':
				return this.handleDispatchTimeout(
					job as Job<DispatchTimeoutJobData>,
				);
			default:
				this.logger.warn(`Unknown job name: ${job.name}`);
		}
	}

	private async handleOfferTrip(job: Job<OfferTripJobData>) {
		const {
			tripId,
			clientId,
			pickupLat,
			pickupLng,
			vehicleType,
			excludedDriverIds,
			attempt,
		} = job.data;
		const currentAttempt = attempt ?? 1;

		this.logger.log(
			`Dispatch attempt ${currentAttempt}/${MAX_DISPATCH_ATTEMPTS} for trip ${tripId}`,
		);

		try {
			await this.handleOfferTripInner(
				job,
				tripId,
				clientId,
				pickupLat,
				pickupLng,
				vehicleType,
				excludedDriverIds ?? [],
				currentAttempt,
			);
		} catch (error) {
			this.logger.error(
				`Dispatch error for trip ${tripId}: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error.stack : undefined,
			);

			if (currentAttempt < MAX_DISPATCH_ATTEMPTS) {
				await this.dispatchService.enqueueOfferTrip({
					...job.data,
					attempt: currentAttempt + 1,
				});
			} else {
				this.tripGateway.sendToUser(clientId, 'trip:no_drivers', {
					tripId,
					message:
						'Nenhum motorista disponível no momento. Tente novamente mais tarde.',
				});
				await this.expoPush.sendToUser(clientId, {
					title: 'Sem motoristas disponíveis',
					body: 'Não encontramos motoristas perto de si. Tente novamente mais tarde.',
					data: { type: 'no_drivers', tripId },
				});
			}
		}
	}

	private async handleOfferTripInner(
		job: Job<OfferTripJobData>,
		tripId: string,
		clientId: string,
		pickupLat: number,
		pickupLng: number,
		vehicleType: string | undefined,
		excludedDriverIds: string[],
		currentAttempt: number,
	) {
		const trip = await this.prisma.client.trip.findUnique({
			where: { id: tripId },
			select: {
				id: true,
				status: true,
				pickupAddress: true,
				dropoffAddress: true,
				estimatedDistanceKm: true,
				estimatedDurationMin: true,
				totalPrice: true,
			},
		});

		if (!trip || trip.status !== TripStatus.REQUESTED) {
			this.logger.log(
				`Trip ${tripId} no longer REQUESTED, skipping dispatch`,
			);
			return;
		}

		const sqlParams: unknown[] = [pickupLng, pickupLat];
		let paramIdx = 3;

		const validVehicleTypes = ['MOTO', 'CARRO'];
		const safeVehicleType =
			vehicleType && validVehicleTypes.includes(vehicleType)
				? vehicleType
				: null;

		let vehicleTypeClause = '';
		if (safeVehicleType) {
			vehicleTypeClause = `AND v.type = $${paramIdx++}`;
			sqlParams.push(safeVehicleType);
		}

		let excludedClause = '';
		if (excludedDriverIds?.length) {
			const placeholders = excludedDriverIds.map(() => `$${paramIdx++}`);
			excludedClause = `AND d.id NOT IN (${placeholders.join(', ')})`;
			sqlParams.push(...excludedDriverIds);
		}

		const nearestDrivers = await this.prisma.client.$queryRawUnsafe<
			{
				id: string;
				userId: string;
				name: string;
				lat: number;
				lng: number;
				distance_km: number;
				vehicle: {
					id: string;
					plateNumber: string;
					brand: string;
					model: string;
					color: string;
					type: string;
				};
			}[]
		>(
			`
			SELECT
				d.id,
				d."userId",
				u.name,
				ST_X(ST_SetSRID(dl.location::geometry, 4326)) AS lat,
				ST_Y(ST_SetSRID(dl.location::geometry, 4326)) AS lng,
				ST_Distance(
					ST_SetSRID(dl.location::geometry, 4326),
					ST_SetSRID(ST_MakePoint($1, $2), 4326)::geometry
				) / 1000 AS distance_km,
				json_build_object(
					'id', v.id,
					'plateNumber', v."plateNumber",
					'brand', v.brand,
					'model', v.model,
					'color', v.color,
					'type', v.type
				) AS vehicle
			FROM "DriverLocation" dl
			INNER JOIN "Driver" d ON d.id = dl."driverId"
			INNER JOIN "User" u ON u.id = d."userId"
			INNER JOIN "Vehicle" v ON v."driverId" = d.id AND v.status = 'ACTIVE' AND v."deletedAt" IS NULL
			WHERE
				d."deletedAt" IS NULL
				AND d."complianceStatus" = 'APPROVED'
				AND d.availability = 'ONLINE'
				${vehicleTypeClause}
				${excludedClause}
				AND ST_IsValid(ST_SetSRID(dl.location::geometry, 4326))
				AND ST_DWithin(
					ST_SetSRID(dl.location::geometry, 4326),
					ST_SetSRID(ST_MakePoint($1, $2), 4326)::geometry,
					10000
				)
			ORDER BY distance_km ASC
			LIMIT 1
			`,
			...sqlParams,
		);

		if (nearestDrivers.length === 0) {
			if (currentAttempt < MAX_DISPATCH_ATTEMPTS) {
				this.logger.log(
					`No drivers found for trip ${tripId}, retrying (attempt ${currentAttempt}/${MAX_DISPATCH_ATTEMPTS})`,
				);
				await this.dispatchService.enqueueOfferTrip({
					...job.data,
					attempt: currentAttempt + 1,
				});
			} else {
				this.logger.log(
					`Max dispatch attempts reached for trip ${tripId}, notifying client`,
				);
				this.tripGateway.sendToUser(clientId, 'trip:no_drivers', {
					tripId,
					message:
						'Nenhum motorista disponível no momento. Tente novamente mais tarde.',
				});
				await this.expoPush.sendToUser(clientId, {
					title: 'Sem motoristas disponíveis',
					body: 'Não encontramos motoristas perto de si. Tente novamente mais tarde.',
					data: { type: 'no_drivers', tripId },
				});
			}
			return;
		}

		const nearest = nearestDrivers[0];

		let driverUnavailable = false;

		const assignment = await this.prisma.client.$transaction(async (tx) => {
			const [lockedTrip] = await tx.$queryRawUnsafe<
				{ id: string; status: string }[]
			>(`SELECT id, status FROM "Trip" WHERE id = $1 FOR UPDATE`, tripId);

			if (!lockedTrip || lockedTrip.status !== TripStatus.REQUESTED) {
				return null;
			}

			const [lockedDriver] = await tx.$queryRawUnsafe<
				{ id: string; availability: string }[]
			>(
				`SELECT id, availability FROM "Driver" WHERE id = $1 FOR UPDATE`,
				nearest.id,
			);

			if (
				!lockedDriver ||
				lockedDriver.availability !== 'ONLINE'
			) {
				driverUnavailable = true;
				return null;
			}

			const existing = await tx.tripAssignment.findFirst({
				where: {
					tripId,
					status: TripAssignmentStatus.OFFERED,
				},
				select: { id: true },
			});

			if (existing) {
				this.logger.warn(
					`Trip ${tripId} already has an active assignment ${existing.id}, skipping`,
				);
				return null;
			}

			return tx.tripAssignment.create({
				data: {
					id: uuidv7(),
					tripId,
					driverId: nearest.id,
					status: TripAssignmentStatus.OFFERED,
				},
			});
		});

		if (!assignment) {
			if (driverUnavailable) {
				this.logger.log(
					`Driver ${nearest.id} is no longer available (caught in transaction), re-enqueueing dispatch`,
				);
				await this.dispatchService.enqueueOfferTrip({
					...job.data,
					excludedDriverIds: [
						...(excludedDriverIds ?? []),
						nearest.id,
					],
					attempt: currentAttempt + 1,
				});
			}
			return;
		}

		if (!this.tripGateway.hasActiveSocket(nearest.userId)) {
			this.logger.log(
				`Driver ${nearest.id} has no active WebSocket, skipping offer and re-enqueueing`,
			);
			await this.prisma.client.tripAssignment.update({
				where: { id: assignment.id },
				data: { status: TripAssignmentStatus.EXPIRED },
			});
			await this.dispatchService.enqueueOfferTrip({
				...job.data,
				excludedDriverIds: [
					...(excludedDriverIds ?? []),
					nearest.id,
				],
				attempt: currentAttempt + 1,
			});
			return;
		}

		const offerData = {
			assignmentId: assignment.id,
			tripId,
			pickupAddress: trip.pickupAddress,
			dropoffAddress: trip.dropoffAddress,
			estimatedDistanceKm: trip.estimatedDistanceKm,
			estimatedDurationMin: trip.estimatedDurationMin,
			totalPrice: trip.totalPrice,
			driverId: nearest.id,
			driverName: nearest.name,
			pickupLat: nearest.lat,
			pickupLng: nearest.lng,
			vehicle: nearest.vehicle,
			offerTimeoutMs: DISPATCH_TIMEOUT_MS,
		};

		this.tripGateway.sendToUser(nearest.userId, 'trip:offer', offerData);

		await this.expoPush.sendToUser(nearest.userId, {
			title: 'Nova solicitação de viagem',
			body: `De ${trip.pickupAddress} para ${trip.dropoffAddress}`,
			data: {
				type: 'trip_offer',
				tripId,
				assignmentId: assignment.id,
			},
		});

		await this.dispatchService.enqueueDispatchTimeout({
			tripId,
			assignmentId: assignment.id,
			clientId,
			driverId: nearest.id,
			driverUserId: nearest.userId,
		});

		this.logger.log(
			`Offered trip ${tripId} to driver ${nearest.id} (assignment ${assignment.id})`,
		);
	}

	private async handleDispatchTimeout(job: Job<DispatchTimeoutJobData>) {
		const { tripId, assignmentId, clientId, driverId, driverUserId } =
			job.data;

		const assignment = await this.prisma.client.tripAssignment.findUnique({
			where: { id: assignmentId },
			select: {
				id: true,
				status: true,
				tripId: true,
				trip: {
					select: { status: true, id: true },
				},
			},
		});

		if (
			!assignment ||
			assignment.status !== TripAssignmentStatus.OFFERED ||
			assignment.trip.status !== TripStatus.REQUESTED
		) {
			this.logger.log(
				`Assignment ${assignmentId} already processed or trip no longer REQUESTED, skipping timeout`,
			);
			return;
		}

		await this.prisma.client.tripAssignment.update({
			where: { id: assignmentId },
			data: { status: TripAssignmentStatus.EXPIRED },
		});

		this.tripGateway.sendToUser(driverUserId, 'trip:offer_expired', {
			assignmentId,
			tripId,
		});

		this.tripGateway.sendToUser(clientId, 'trip:offer_expired', {
			assignmentId,
			tripId,
			driverId,
		});

		this.logger.log(
			`Assignment ${assignmentId} expired, searching for next driver`,
		);

		const trip = await this.prisma.client.trip.findUnique({
			where: { id: tripId },
			select: { pickupCoords: true, clientId: true },
		});

		if (!trip) return;

		const coordsMatch = trip.pickupCoords.match(
			/POINT\(([-\d.]+)\s+([-\d.]+)\)/,
		);
		if (!coordsMatch) {
			this.logger.error(
				`Failed to parse pickupCoords for trip ${tripId}: ${trip.pickupCoords}`,
			);
			return;
		}

		const pickupLng = parseFloat(coordsMatch[1]);
		const pickupLat = parseFloat(coordsMatch[2]);

		await this.dispatchService.enqueueOfferTrip({
			tripId,
			clientId: trip.clientId,
			pickupLat,
			pickupLng,
			excludedDriverIds: [driverId],
			attempt:
				(job.data as DispatchTimeoutJobData & { attempt?: number })
					.attempt ?? 1,
		});
	}
}
