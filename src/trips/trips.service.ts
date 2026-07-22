import {
	Injectable,
	NotFoundException,
	BadRequestException,
	ForbiddenException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import {
	TripStatus,
	TripEventType,
	UserRole,
	ServiceType,
	VehicleType,
	DeliveryStatus,
	Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CouponsService } from '../coupons/coupons.service';
import { TripGatewayService } from '../trip-gateway/trip-gateway.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { ExpoPushService } from '../notifications/expo-push.service';
import { CreateTripDto, CoordsDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { ListTripsDto } from './dto/list-trips.dto';
import { UpdateTripStatusDto } from './dto/update-trip-status.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { EstimateTripDto } from './dto/estimate-trip.dto';
import { TripStatsDto } from './dto/trip-stats.dto';
import { coordsToWkt, distanceInKm } from '../common/helpers/coords.helper';

const defaultTripSelect = {
	id: true,
	idempotencyKey: true,
	status: true,
	serviceType: true,
	deliveryStatus: true,
	pickupCoords: true,
	pickupAddress: true,
	dropoffAddress: true,
	estimatedDistanceKm: true,
	estimatedDurationMin: true,
	actualDistanceKm: true,
	actualDurationMin: true,
	actualPickupCoords: true,
	actualDropoffCoords: true,
	surgeMultiplierApplied: true,
	subtotal: true,
	ivaAmount: true,
	serviceFee: true,
	driverEarnings: true,
	totalPrice: true,
	changeFor: true,
	discountAmount: true,
	paymentMethod: true,
	paymentStatus: true,
	requestedAt: true,
	acceptedAt: true,
	startedAt: true,
	completedAt: true,
	cancelledAt: true,
	cancelReason: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
} as const;

const validTransitions: Record<TripStatus, TripStatus[]> = {
	[TripStatus.REQUESTED]: [TripStatus.ACCEPTED, TripStatus.CANCELLED],
	[TripStatus.ACCEPTED]: [
		TripStatus.PICKUP_IN_PROGRESS,
		TripStatus.CANCELLED,
	],
	[TripStatus.PICKUP_IN_PROGRESS]: [TripStatus.STARTED, TripStatus.CANCELLED],
	[TripStatus.STARTED]: [TripStatus.COMPLETED, TripStatus.CANCELLED],
	[TripStatus.COMPLETED]: [],
	[TripStatus.CANCELLED]: [],
	[TripStatus.NEEDS_REVIEW]: [TripStatus.CANCELLED, TripStatus.REQUESTED],
};

const statusEventMap: Record<TripStatus, TripEventType> = {
	[TripStatus.REQUESTED]: TripEventType.TRIP_REQUESTED,
	[TripStatus.ACCEPTED]: TripEventType.DRIVER_ACCEPTED,
	[TripStatus.PICKUP_IN_PROGRESS]: TripEventType.DRIVER_ARRIVED_PICKUP,
	[TripStatus.STARTED]: TripEventType.TRIP_STARTED,
	[TripStatus.COMPLETED]: TripEventType.TRIP_COMPLETED,
	[TripStatus.CANCELLED]: TripEventType.TRIP_CANCELLED,
	[TripStatus.NEEDS_REVIEW]: TripEventType.TRIP_NEEDS_REVIEW,
};

const deliveryStatusTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
	[DeliveryStatus.WAITING_PICKUP]: [DeliveryStatus.PICKED_UP],
	[DeliveryStatus.PICKED_UP]: [DeliveryStatus.IN_TRANSIT],
	[DeliveryStatus.IN_TRANSIT]: [DeliveryStatus.DELIVERED],
	[DeliveryStatus.DELIVERED]: [],
};

const statusTimestampField: Record<TripStatus, string> = {
	[TripStatus.REQUESTED]: 'requestedAt',
	[TripStatus.ACCEPTED]: 'acceptedAt',
	[TripStatus.PICKUP_IN_PROGRESS]: 'startedAt',
	[TripStatus.STARTED]: 'startedAt',
	[TripStatus.COMPLETED]: 'completedAt',
	[TripStatus.CANCELLED]: 'cancelledAt',
	[TripStatus.NEEDS_REVIEW]: 'updatedAt',
};

interface ZoneResult {
	id: string;
	surgeMultiplier: number;
}

@Injectable()
export class TripsService {
	constructor(
		private prisma: PrismaService,
		private logger: LoggerService,
		private couponsService: CouponsService,
		private tripGateway: TripGatewayService,
		private dispatchService: DispatchService,
		private expoPush: ExpoPushService,
	) {}

	async create(dto: CreateTripDto, userId: string, userRole: UserRole) {
		let clientId = userId;

		if (userRole !== UserRole.CLIENT && dto['clientId']) {
			clientId = dto['clientId'] as string;
		}

		if (dto.idempotencyKey) {
			const existing = await this.prisma.client.trip.findUnique({
				where: { idempotencyKey: dto.idempotencyKey },
				select: { id: true },
			});
			if (existing) {
				throw new BadRequestException(
					'Já existe uma viagem com esta chave de idempotência',
				);
			}
		}

		if (dto.serviceType === ServiceType.DELIVERY && !dto.deliveryDetails) {
			throw new BadRequestException(
				'Detalhes de entrega são obrigatórios para serviço de entrega',
			);
		}

		const estimate = await this.estimatePrice({
			pickupCoords: dto.pickupCoords,
			dropoffCoords: dto.dropoffCoords,
			vehicleType: dto.vehicleType,
			couponCode: dto.couponCode,
			userId: clientId,
		});

		const tripData: Prisma.TripCreateInput = {
			id: uuidv7(),
			client: { connect: { id: clientId } },
			serviceType: dto.serviceType,
			status: TripStatus.REQUESTED,
			pickupCoords: coordsToWkt(
				dto.pickupCoords.lat,
				dto.pickupCoords.lng,
			),
			dropoffCoords: coordsToWkt(
				dto.dropoffCoords.lat,
				dto.dropoffCoords.lng,
			),
			pickupAddress: dto.pickupAddress,
			pickupReference: dto.pickupReference ?? null,
			dropoffAddress: dto.dropoffAddress,
			dropoffReference: dto.dropoffReference ?? null,
			paymentMethod: dto.paymentMethod,
			estimatedDistanceKm: estimate.estimatedDistanceKm,
			estimatedDurationMin: estimate.estimatedDurationMin,
			priceConfig: estimate.priceConfigId
				? { connect: { id: estimate.priceConfigId } }
				: undefined,
			pickupZoneId: estimate.pickupZoneId,
			dropoffZoneId: estimate.dropoffZoneId,
			surgeMultiplierApplied: estimate.surgeMultiplierApplied,
			subtotal: estimate.subtotal,
			ivaAmount: estimate.ivaAmount,
			serviceFee: estimate.serviceFee,
			driverEarnings: estimate.driverEarnings,
			totalPrice: estimate.totalPrice,
			discountAmount: estimate.discountAmount,
			coupon: estimate.couponId
				? { connect: { id: estimate.couponId } }
				: undefined,
		};

		if (dto.idempotencyKey) {
			tripData.idempotencyKey = dto.idempotencyKey;
		}

		if (dto.requestLocation) {
			tripData.requestLocation = coordsToWkt(
				dto.requestLocation.lat,
				dto.requestLocation.lng,
			);
		}

		if (dto.changeFor !== undefined) {
			tripData.changeFor = dto.changeFor;
		}

		if (dto.pickupUserAddressId) {
			tripData.pickupUserAddressId = dto.pickupUserAddressId;
		}

		if (dto.dropoffUserAddressId) {
			tripData.dropoffUserAddressId = dto.dropoffUserAddressId;
		}

		if (dto.serviceType === ServiceType.DELIVERY) {
			tripData.deliveryStatus = DeliveryStatus.WAITING_PICKUP;
		}

		const trip = await this.prisma.client.trip.create({
			data: tripData,
			select: {
				...defaultTripSelect,
				client: {
					select: {
						id: true,
						name: true,
						surname: true,
						phoneNumber: true,
					},
				},
				deliveryDetails: true,
			},
		});

		if (dto.serviceType === ServiceType.DELIVERY && dto.deliveryDetails) {
			await this.prisma.client.deliveryDetails.create({
				data: {
					id: uuidv7(),
					tripId: trip.id,
					receiverName: dto.deliveryDetails.receiverName,
					receiverPhone: dto.deliveryDetails.receiverPhone,
					packageType: dto.deliveryDetails.packageType,
					notes: dto.deliveryDetails.notes ?? null,
				},
			});
		}

		await this.createTripEvent(
			trip.id,
			TripEventType.TRIP_REQUESTED,
			clientId,
		);

		if (estimate.couponId) {
			await this.couponsService.incrementUsage(estimate.couponId);
		}

		this.tripGateway.emitTripStatus(trip.id, TripStatus.REQUESTED, {
			clientId,
			serviceType: dto.serviceType,
		});

		this.logger.log(
			`Trip ${trip.id} created for client ${clientId} (${dto.serviceType})`,
			'TripsService',
		);

		const coordsMatch = trip.pickupCoords.match(
			/POINT\(([-\d.]+)\s+([-\d.]+)\)/,
		);
		if (coordsMatch) {
			const pickupLng = parseFloat(coordsMatch[1]);
			const pickupLat = parseFloat(coordsMatch[2]);
			await this.dispatchService
				.enqueueOfferTrip({
					tripId: trip.id,
					clientId,
					pickupLat,
					pickupLng,
					vehicleType: dto.vehicleType,
					attempt: 1,
					excludedDriverIds: [],
				})
				.catch((err: unknown) =>
					this.logger.error(
						`Failed to enqueue dispatch for trip ${trip.id}`,
						err instanceof Error ? err.message : String(err),
					),
				);
		}

		return trip;
	}

	async list(dto: ListTripsDto, userId: string, userRole: UserRole) {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 20;
		const skip = (page - 1) * limit;

		const where: Prisma.TripWhereInput = {};

		if (userRole === UserRole.CLIENT) {
			where.clientId = userId;
		} else if (userRole === UserRole.DRIVER) {
			const driver = await this.prisma.client.driver.findUnique({
				where: { userId },
				select: { id: true },
			});
			if (driver) {
				where.driverId = driver.id;
			} else {
				return {
					trips: [],
					total: 0,
					page,
					limit,
					totalPages: 0,
				};
			}
		}

		if (!dto.includeDeleted) {
			where.deletedAt = null;
		}

		if (dto.status) where.status = dto.status;
		if (dto.serviceType) where.serviceType = dto.serviceType;
		if (dto.paymentStatus) where.paymentStatus = dto.paymentStatus;
		if (dto.deliveryStatus) where.deliveryStatus = dto.deliveryStatus;
		if (dto.clientId && userRole !== UserRole.CLIENT)
			where.clientId = dto.clientId;
		if (dto.driverId && userRole !== UserRole.DRIVER)
			where.driverId = dto.driverId;

		if (dto.search) {
			where.OR = [
				{
					pickupAddress: {
						contains: dto.search,
						mode: 'insensitive',
					},
				},
				{
					dropoffAddress: {
						contains: dto.search,
						mode: 'insensitive',
					},
				},
			];
		}

		if (dto.dateFrom || dto.dateTo) {
			const createdAtFilter: Prisma.DateTimeFilter = {};
			if (dto.dateFrom) {
				createdAtFilter.gte = new Date(dto.dateFrom);
			}
			if (dto.dateTo) {
				createdAtFilter.lte = new Date(dto.dateTo);
			}
			where.createdAt = createdAtFilter;
		}

		const orderBy: Record<string, 'asc' | 'desc'> = {};
		orderBy[dto.sortBy ?? 'createdAt'] = dto.sortOrder ?? 'desc';

		const [trips, total] = await Promise.all([
			this.prisma.client.trip.findMany({
				where,
				skip,
				take: limit,
				orderBy,
				select: {
					...defaultTripSelect,
					client: {
						select: {
							id: true,
							name: true,
							surname: true,
						},
					},
					driver: {
						select: {
							id: true,
							biNumber: true,
							user: {
								select: {
									id: true,
									name: true,
									surname: true,
								},
							},
						},
					},
				},
			}),
			this.prisma.client.trip.count({
				where,
			}),
		]);

		return {
			trips,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findById(id: string, userId: string, userRole: UserRole) {
		const trip = await this.prisma.client.trip.findUnique({
			where: { id },
			select: {
				...defaultTripSelect,
				pickupCoords: true,
				dropoffCoords: true,
				requestLocation: true,
				pickupUserAddressId: true,
				dropoffUserAddressId: true,
				client: {
					select: {
						id: true,
						name: true,
						surname: true,
						email: true,
						phoneNumber: true,
						image: true,
					},
				},
				driver: {
					select: {
						id: true,
						biNumber: true,
						licenseNumber: true,
						user: {
							select: {
								id: true,
								name: true,
								surname: true,
								phoneNumber: true,
								image: true,
							},
						},
						vehicles: {
							select: {
								id: true,
								plateNumber: true,
								brand: true,
								model: true,
								type: true,
								color: true,
							},
						},
					},
				},
				priceConfig: {
					select: {
						id: true,
						vehicleType: true,
						baseFare: true,
						pricePerKm: true,
						pricePerMin: true,
						minFare: true,
						ivaRate: true,
						serviceFeeRate: true,
					},
				},
				coupon: {
					select: {
						id: true,
						code: true,
						discountType: true,
						discountValue: true,
					},
				},
				deliveryDetails: true,
				review: true,
				disputes: true,
				assignments: {
					select: {
						id: true,
						status: true,
						createdAt: true,
						driver: {
							select: {
								id: true,
								user: {
									select: {
										id: true,
										name: true,
										surname: true,
									},
								},
							},
						},
					},
				},
			},
		});

		if (!trip) {
			throw new NotFoundException('Viagem não encontrada');
		}

		if (userRole === UserRole.CLIENT && trip.client.id !== userId) {
			throw new ForbiddenException(
				'Não tem permissão para ver esta viagem',
			);
		}

		if (userRole === UserRole.DRIVER && trip.driver?.id) {
			const driver = await this.prisma.client.driver.findUnique({
				where: { userId },
				select: { id: true },
			});
			if (!driver || trip.driver.id !== driver.id) {
				throw new ForbiddenException(
					'Não tem permissão para ver esta viagem',
				);
			}
		}

		return trip;
	}

	async update(id: string, dto: UpdateTripDto) {
		const trip = await this.prisma.client.trip.findUnique({
			where: { id },
		});

		if (!trip || trip.deletedAt) {
			throw new NotFoundException('Viagem não encontrada');
		}

		const data: Prisma.TripUpdateInput = {};

		if (dto.pickupCoords) {
			data.pickupCoords = coordsToWkt(
				dto.pickupCoords.lat,
				dto.pickupCoords.lng,
			);
		}
		if (dto.dropoffCoords) {
			data.dropoffCoords = coordsToWkt(
				dto.dropoffCoords.lat,
				dto.dropoffCoords.lng,
			);
		}
		if (dto.pickupAddress !== undefined)
			data.pickupAddress = dto.pickupAddress;
		if (dto.pickupReference !== undefined)
			data.pickupReference = dto.pickupReference;
		if (dto.dropoffAddress !== undefined)
			data.dropoffAddress = dto.dropoffAddress;
		if (dto.dropoffReference !== undefined)
			data.dropoffReference = dto.dropoffReference;
		if (dto.actualDistanceKm !== undefined)
			data.actualDistanceKm = dto.actualDistanceKm;
		if (dto.actualDurationMin !== undefined)
			data.actualDurationMin = dto.actualDurationMin;
		if (dto.actualPickupCoords) {
			data.actualPickupCoords = coordsToWkt(
				dto.actualPickupCoords.lat,
				dto.actualPickupCoords.lng,
			);
		}
		if (dto.actualDropoffCoords) {
			data.actualDropoffCoords = coordsToWkt(
				dto.actualDropoffCoords.lat,
				dto.actualDropoffCoords.lng,
			);
		}
		if (dto.requestLocation) {
			data.requestLocation = coordsToWkt(
				dto.requestLocation.lat,
				dto.requestLocation.lng,
			);
		}
		if (dto.changeFor !== undefined) {
			data.changeFor = dto.changeFor;
		}
		if (dto.pickupUserAddressId !== undefined) {
			data.pickupUserAddressId = dto.pickupUserAddressId;
		}
		if (dto.dropoffUserAddressId !== undefined) {
			data.dropoffUserAddressId = dto.dropoffUserAddressId;
		}

		if (Object.keys(data).length === 0) {
			throw new BadRequestException('Nenhum dado para atualizar');
		}

		const updated = await this.prisma.client.trip.update({
			where: { id },
			data,
			select: defaultTripSelect,
		});

		this.logger.log(`Trip ${id} updated`, 'TripsService');

		return updated;
	}

	async remove(id: string) {
		const trip = await this.prisma.client.trip.findUnique({
			where: { id },
		});

		if (!trip || trip.deletedAt) {
			throw new NotFoundException('Viagem não encontrada');
		}

		await this.prisma.client.trip.update({
			where: { id },
			data: { deletedAt: new Date() },
		});

		this.logger.log(`Trip ${id} soft-deleted`, 'TripsService');

		return {
			msg: 'Viagem removida com sucesso',
		};
	}

	async updateStatus(
		id: string,
		dto: UpdateTripStatusDto,
		actorUserId: string,
		userRole: UserRole,
	) {
		const trip = await this.prisma.client.trip.findUnique({
			where: { id },
		});

		if (!trip || trip.deletedAt) {
			throw new NotFoundException('Viagem não encontrada');
		}

		const currentStatus = trip.status;
		const nextStatus = dto.status;

		if (!this.isValidTransition(currentStatus, nextStatus)) {
			throw new BadRequestException(
				`Transição inválida: ${currentStatus} -> ${nextStatus}`,
			);
		}

		if (
			userRole === UserRole.DRIVER &&
			nextStatus === TripStatus.CANCELLED &&
			!dto.cancelReason
		) {
			throw new BadRequestException('Motivo de cancelamento obrigatório');
		}

		const updateData: Prisma.TripUpdateInput = {
			status: nextStatus,
		};

		const timestampField = statusTimestampField[nextStatus];
		if (timestampField) {
			(updateData as Record<string, unknown>)[timestampField] =
				new Date();
		}

		if (nextStatus === TripStatus.CANCELLED) {
			updateData.cancelReason = dto.cancelReason ?? null;
			updateData.cancelledByUserId = actorUserId;
		}

		const updated = await this.prisma.client.trip.update({
			where: { id },
			data: updateData,
			select: {
				...defaultTripSelect,
				cancelReason: true,
			},
		});

		if (nextStatus === TripStatus.COMPLETED && trip.driverId) {
			let actualDurationMin = trip.estimatedDurationMin ?? 1;
			let actualDistanceKm: number | null | undefined =
				trip.estimatedDistanceKm;
			let actualPickupCoords: string | undefined;
			let actualDropoffCoords: string | undefined;
			try {
				actualDurationMin = trip.startedAt
					? Math.max(
							1,
							Math.round(
								(new Date().getTime() -
									new Date(trip.startedAt).getTime()) /
									60000,
							),
						)
					: (trip.estimatedDurationMin ?? 1);

				const points =
					await this.prisma.client.tripLocationPoint.findMany({
						where: { tripId: id },
						orderBy: { recordedAt: 'asc' },
						select: { location: true },
					});

				actualDistanceKm = trip.estimatedDistanceKm;
				if (points.length >= 2) {
					let total = 0;
					for (let i = 1; i < points.length; i++) {
						const prev = points[i - 1].location.match(
							/POINT\(([-\d.]+)\s+([-\d.]+)\)/,
						);
						const curr = points[i].location.match(
							/POINT\(([-\d.]+)\s+([-\d.]+)\)/,
						);
						if (prev && curr) {
							total += distanceInKm(
								parseFloat(prev[2]),
								parseFloat(prev[1]),
								parseFloat(curr[2]),
								parseFloat(curr[1]),
							);
						}
					}
					if (total > 0) {
						actualDistanceKm = round(total, 2);
					}
				}

				const priceConfig =
					await this.prisma.client.priceConfig.findUnique({
						where: { id: trip.priceConfigId ?? undefined },
					});

				actualPickupCoords =
					points.length >= 1 ? points[0].location : undefined;
				actualDropoffCoords =
					points.length >= 1
						? points[points.length - 1].location
						: undefined;

				const baseTripUpdate: Prisma.TripUpdateInput = {
					actualDistanceKm,
					actualDurationMin,
					actualPickupCoords,
					actualDropoffCoords,
				};

				if (priceConfig) {
					let subtotal =
						Number(priceConfig.baseFare) +
						Number(priceConfig.pricePerKm) *
							Number(actualDistanceKm) +
						Number(priceConfig.pricePerMin) * actualDurationMin;

					subtotal = Math.max(Number(priceConfig.minFare), subtotal);
					subtotal =
						subtotal * Number(trip.surgeMultiplierApplied ?? 1);
					subtotal = Math.max(
						0,
						subtotal - Number(trip.discountAmount ?? 0),
					);

					const ivaAmount = subtotal * priceConfig.ivaRate;
					const serviceFee = subtotal * priceConfig.serviceFeeRate;
					const driverEarnings = subtotal - serviceFee;
					const totalPrice = subtotal + ivaAmount;

					Object.assign(baseTripUpdate, {
						subtotal: round(subtotal, 2),
						ivaAmount: round(ivaAmount, 2),
						serviceFee: round(serviceFee, 2),
						driverEarnings: round(driverEarnings, 2),
						totalPrice: round(totalPrice, 2),
						paymentStatus: 'PAID',
					});

					await this.prisma.client.trip.update({
						where: { id },
						data: baseTripUpdate,
					});

					await this.prisma.client.financialTransaction.create({
						data: {
							id: uuidv7(),
							tripId: id,
							userId: trip.clientId,
							driverId: trip.driverId,
							type: 'TRIP_PAYMENT',
							status: 'COMPLETED',
							amount: round(totalPrice, 2),
							currency: 'AOA',
						},
					});

					const driverUpdateData1: Prisma.DriverUpdateInput = {
						completedTripsCount: { increment: 1 },
						availability: 'ONLINE',
					};
					if (trip.paymentMethod !== 'CASH') {
						driverUpdateData1.availableBalance = {
							increment: round(driverEarnings, 2),
						};
					}
					await this.prisma.client.driver.update({
						where: { id: trip.driverId },
						data: driverUpdateData1,
					});
				} else {
					await this.prisma.client.trip.update({
						where: { id },
						data: baseTripUpdate,
					});

					const driverUpdateData2: Prisma.DriverUpdateInput = {
						completedTripsCount: { increment: 1 },
						availability: 'ONLINE',
					};
					if (trip.paymentMethod !== 'CASH') {
						driverUpdateData2.availableBalance = {
							increment: Number(trip.driverEarnings ?? 0),
						};
					}
					await this.prisma.client.driver.update({
						where: { id: trip.driverId },
						data: driverUpdateData2,
					});
				}
			} catch (err: unknown) {
				this.logger.error(
					`Failed to process completion for trip ${id}`,
					err instanceof Error ? err.message : String(err),
				);
				await this.prisma.client.trip
					.update({
						where: { id },
						data: {
							actualDistanceKm,
							actualDurationMin,
							actualPickupCoords,
							actualDropoffCoords,
						},
					})
					.catch((innerErr: unknown) =>
						this.logger.error(
							`Failed to save actual coords for trip ${id}`,
							innerErr instanceof Error
								? innerErr.message
								: String(innerErr),
						),
					);
				const driverUpdateData3: Prisma.DriverUpdateInput = {
					completedTripsCount: { increment: 1 },
					availability: 'ONLINE',
				};
				if (trip.paymentMethod !== 'CASH') {
					driverUpdateData3.availableBalance = {
						increment: Number(trip.driverEarnings ?? 0),
					};
				}
				await this.prisma.client.driver.update({
					where: { id: trip.driverId },
					data: driverUpdateData3,
				});
			}
		}

		if (nextStatus === TripStatus.CANCELLED && trip.driverId) {
			await this.prisma.client.driver.update({
				where: { id: trip.driverId },
				data: {
					cancelledTripsCount: { increment: 1 },
					availability: 'ONLINE',
				},
			});
		}

		await this.createTripEvent(id, statusEventMap[nextStatus], actorUserId);

		this.tripGateway.emitTripStatus(id, nextStatus);

		void this.sendStatusPushNotifications(trip, nextStatus).catch(
			(err: unknown) =>
				this.logger.error(
					`Failed to send push for trip ${id} status ${nextStatus}`,
					err instanceof Error ? err.message : String(err),
				),
		);

		if (nextStatus === TripStatus.ACCEPTED && trip.driverId) {
			const driver = await this.prisma.client.driver.findUnique({
				where: { id: trip.driverId },
				select: {
					id: true,
					user: { select: { name: true, phoneNumber: true } },
					vehicles: {
						where: { status: 'ACTIVE' },
						select: {
							id: true,
							plateNumber: true,
							brand: true,
							model: true,
							color: true,
						},
						take: 1,
					},
				},
			});
			if (driver) {
				this.tripGateway.emitDriverAssigned(
					id,
					{
						id: driver.id,
						name: driver.user.name,
						phoneNumber: driver.user.phoneNumber,
					},
					driver.vehicles[0]
						? {
								plateNumber: driver.vehicles[0].plateNumber,
								brand: driver.vehicles[0].brand,
								model: driver.vehicles[0].model,
								color: driver.vehicles[0].color,
							}
						: undefined,
				);
			}
		}

		this.logger.log(
			`Trip ${id} status: ${currentStatus} -> ${nextStatus}`,
			'TripsService',
		);

		return updated;
	}

	private async sendStatusPushNotifications(
		trip: { id: string; clientId: string; driverId: string | null },
		nextStatus: TripStatus,
	) {
		const pushData = { type: 'trip_status', tripId: trip.id };

		switch (nextStatus) {
			case TripStatus.PICKUP_IN_PROGRESS:
				if (trip.clientId) {
					await this.expoPush.sendToUser(trip.clientId, {
						title: 'Motorista chegou',
						body: 'O motorista chegou ao local de embarque',
						data: pushData,
					});
				}
				break;

			case TripStatus.STARTED:
				if (trip.clientId) {
					await this.expoPush.sendToUser(trip.clientId, {
						title: 'Viagem em curso',
						body: 'A sua viagem começou. Boa viagem!',
						data: pushData,
					});
				}
				break;

			case TripStatus.COMPLETED:
				if (trip.clientId) {
					await this.expoPush.sendToUser(trip.clientId, {
						title: 'Viagem concluída',
						body: 'A sua viagem foi concluída com sucesso',
						data: pushData,
					});
				}
				break;

			case TripStatus.CANCELLED:
				if (trip.clientId) {
					await this.expoPush.sendToUser(trip.clientId, {
						title: 'Viagem cancelada',
						body: 'A sua viagem foi cancelada',
						data: pushData,
					});
				}
				break;

			default:
				break;
		}
	}

	async updateDeliveryStatus(
		id: string,
		dto: UpdateDeliveryStatusDto,
		actorUserId: string,
	) {
		const trip = await this.prisma.client.trip.findUnique({
			where: { id },
		});

		if (!trip || trip.deletedAt) {
			throw new NotFoundException('Viagem não encontrada');
		}

		if (trip.serviceType !== ServiceType.DELIVERY) {
			throw new BadRequestException('Esta viagem não é do tipo entrega');
		}

		const currentDeliveryStatus = trip.deliveryStatus;
		const nextDeliveryStatus = dto.deliveryStatus;

		if (!currentDeliveryStatus) {
			throw new BadRequestException(
				'Estado de entrega não definido para esta viagem',
			);
		}

		const allowedNext = deliveryStatusTransitions[currentDeliveryStatus];
		if (!allowedNext?.includes(nextDeliveryStatus)) {
			throw new BadRequestException(
				`Transição inválida: ${currentDeliveryStatus} -> ${nextDeliveryStatus}`,
			);
		}

		const updated = await this.prisma.client.trip.update({
			where: { id },
			data: { deliveryStatus: nextDeliveryStatus },
			select: defaultTripSelect,
		});

		await this.createTripEvent(
			id,
			nextDeliveryStatus === DeliveryStatus.PICKED_UP
				? TripEventType.PICKUP_CONFIRMED
				: nextDeliveryStatus === DeliveryStatus.IN_TRANSIT
					? TripEventType.LOCATION_UPDATED
					: nextDeliveryStatus === DeliveryStatus.DELIVERED
						? TripEventType.ARRIVED_DROPOFF
						: TripEventType.TRIP_REQUESTED,
			actorUserId,
		);

		this.tripGateway.emitDeliveryStatus(id, nextDeliveryStatus);

		this.logger.log(
			`Trip ${id} delivery status: ${currentDeliveryStatus} -> ${nextDeliveryStatus}`,
			'TripsService',
		);

		return updated;
	}

	async cancel(
		id: string,
		cancelReason: string,
		userId: string,
		userRole: UserRole,
	) {
		const trip = await this.prisma.client.trip.findUnique({
			where: { id },
		});

		if (!trip || trip.deletedAt) {
			throw new NotFoundException('Viagem não encontrada');
		}

		if (userRole === UserRole.CLIENT && trip.clientId !== userId) {
			throw new ForbiddenException(
				'Não pode cancelar uma viagem que não lhe pertence',
			);
		}

		if (userRole === UserRole.DRIVER && trip.driverId) {
			const driver = await this.prisma.client.driver.findUnique({
				where: { userId },
				select: { id: true },
			});
			if (!driver || trip.driverId !== driver.id) {
				throw new ForbiddenException(
					'Não pode cancelar uma viagem que não lhe está atribuída',
				);
			}
		}

		if (!this.isValidTransition(trip.status, TripStatus.CANCELLED)) {
			throw new BadRequestException(
				`Viagem em estado ${trip.status} não pode ser cancelada`,
			);
		}

		const updated = await this.prisma.client.trip.update({
			where: { id },
			data: {
				status: TripStatus.CANCELLED,
				cancelledAt: new Date(),
				cancelReason,
				cancelledByUserId: userId,
			},
			select: defaultTripSelect,
		});

		if (trip.driverId) {
			await this.prisma.client.driver.update({
				where: { id: trip.driverId },
				data: {
					cancelledTripsCount: { increment: 1 },
				},
			});
		}

		await this.createTripEvent(id, TripEventType.TRIP_CANCELLED, userId);

		this.tripGateway.emitTripStatus(id, TripStatus.CANCELLED, {
			cancelReason,
			cancelledBy: userId,
		});

		this.logger.log(
			`Trip ${id} cancelled by ${userId}: ${cancelReason}`,
			'TripsService',
		);

		return updated;
	}

	async updatePayment(id: string, dto: UpdatePaymentStatusDto) {
		const trip = await this.prisma.client.trip.findUnique({
			where: { id },
		});

		if (!trip || trip.deletedAt) {
			throw new NotFoundException('Viagem não encontrada');
		}

		const updated = await this.prisma.client.trip.update({
			where: { id },
			data: {
				paymentStatus: dto.paymentStatus,
			},
			select: {
				...defaultTripSelect,
				cancelReason: true,
			},
		});

		if (dto.externalReference) {
			await this.prisma.client.financialTransaction.create({
				data: {
					id: uuidv7(),
					tripId: id,
					type: 'TRIP_PAYMENT',
					status:
						dto.paymentStatus === 'PAID' ? 'COMPLETED' : 'PENDING',
					amount: trip.totalPrice,
					externalReference: dto.externalReference,
				},
			});
		}

		this.tripGateway.sendToTripRoom(id, 'trip:payment_update', {
			tripId: id,
			paymentStatus: dto.paymentStatus,
			updatedAt: new Date().toISOString(),
		});

		this.logger.log(
			`Trip ${id} payment status: ${trip.paymentStatus} -> ${dto.paymentStatus}`,
			'TripsService',
		);

		return updated;
	}

	async estimate(dto: EstimateTripDto) {
		const estimation = await this.estimatePrice({
			pickupCoords: dto.pickupCoords,
			dropoffCoords: dto.dropoffCoords,
			vehicleType: dto.vehicleType,
		});

		return {
			...estimation,
			serviceType: dto.serviceType,
		};
	}

	async getStats(dto: TripStatsDto) {
		const dateFrom = new Date(dto.dateFrom);
		const dateTo = new Date(dto.dateTo);
		const groupBy = dto.groupBy ?? 'day';

		const truncMap: Record<string, string> = {
			day: 'DATE(',
			week: "DATE_TRUNC('week', ",
			month: "DATE_TRUNC('month', ",
		};

		const truncFn = truncMap[groupBy];

		const stats = await (
			this.prisma.$queryRawUnsafe as unknown as (
				query: string,
				...params: unknown[]
			) => Promise<
				{
					period: string;
					totalTrips: number;
					completedTrips: number;
					cancelledTrips: number;
					totalRevenue: number;
					avgTripValue: number;
				}[]
			>
		)(
			`SELECT 
				${truncFn}"createdAt") as period,
				COUNT(*)::int as "totalTrips",
				COUNT(*) FILTER (WHERE status = 'COMPLETED')::int as "completedTrips",
				COUNT(*) FILTER (WHERE status = 'CANCELLED')::int as "cancelledTrips",
				COALESCE(SUM("totalPrice") FILTER (WHERE status = 'COMPLETED'), 0) as "totalRevenue",
				COALESCE(AVG("totalPrice") FILTER (WHERE status = 'COMPLETED'), 0) as "avgTripValue"
			FROM "Trip"
			WHERE "createdAt" >= $1 AND "createdAt" <= $2 AND "deletedAt" IS NULL
			GROUP BY period
			ORDER BY period ASC`,
			dateFrom,
			dateTo,
		);

		return stats;
	}

	async getEvents(id: string, userId: string, userRole: UserRole) {
		const trip = await this.prisma.client.trip.findUnique({
			where: { id },
			select: { id: true, clientId: true, driverId: true },
		});

		if (!trip) {
			throw new NotFoundException('Viagem não encontrada');
		}

		if (userRole === UserRole.CLIENT && trip.clientId !== userId) {
			throw new ForbiddenException(
				'Não tem permissão para ver esta viagem',
			);
		}

		if (userRole === UserRole.DRIVER) {
			const driver = await this.prisma.client.driver.findUnique({
				where: { userId },
				select: { id: true },
			});
			if (!driver || trip.driverId !== driver.id) {
				throw new ForbiddenException(
					'Não tem permissão para ver esta viagem',
				);
			}
		}

		const events = await this.prisma.client.tripEvent.findMany({
			where: { tripId: id },
			orderBy: { createdAt: 'asc' },
		});

		return events;
	}

	private isValidTransition(current: TripStatus, next: TripStatus): boolean {
		return validTransitions[current]?.includes(next) ?? false;
	}

	private async createTripEvent(
		tripId: string,
		type: TripEventType,
		actorUserId?: string,
	) {
		await this.prisma.client.tripEvent.create({
			data: {
				id: uuidv7(),
				tripId,
				type,
				actorUserId: actorUserId ?? null,
			},
		});
	}

	private async estimatePrice(params: {
		pickupCoords: CoordsDto;
		dropoffCoords: CoordsDto;
		vehicleType: VehicleType;
		couponCode?: string;
		userId?: string;
	}) {
		const priceConfig = await this.prisma.client.priceConfig.findFirst({
			where: {
				vehicleType: params.vehicleType,
				isActive: true,
			},
		});

		if (!priceConfig) {
			throw new BadRequestException(
				`Configuração de preço não encontrada para ${params.vehicleType}`,
			);
		}

		const distanceKm = distanceInKm(
			params.pickupCoords.lat,
			params.pickupCoords.lng,
			params.dropoffCoords.lat,
			params.dropoffCoords.lng,
		);

		const estimatedMinutes = Math.max(1, Math.ceil((distanceKm / 30) * 60));

		const pickupZone = await this.findZoneForCoords(
			params.pickupCoords.lat,
			params.pickupCoords.lng,
		);

		const dropoffZone = await this.findZoneForCoords(
			params.dropoffCoords.lat,
			params.dropoffCoords.lng,
		);

		const surgeMultiplier = Math.max(
			pickupZone?.surgeMultiplier ?? 1.0,
			dropoffZone?.surgeMultiplier ?? 1.0,
		);

		let subtotal =
			Number(priceConfig.baseFare) +
			Number(priceConfig.pricePerKm) * distanceKm +
			Number(priceConfig.pricePerMin) * estimatedMinutes;

		subtotal = Math.max(Number(priceConfig.minFare), subtotal);
		subtotal = subtotal * surgeMultiplier;

		let discountAmount = 0;
		let couponId: string | undefined;

		if (params.couponCode) {
			const validation = await this.couponsService.validate({
				code: params.couponCode,
				tripAmount: Math.round(subtotal * 100) / 100,
				userId: params.userId ?? '',
			});

			if (validation.valid && validation.coupon) {
				discountAmount = validation.discountApplied ?? 0;
				couponId = validation.coupon.id;
			}
		}

		subtotal = Math.max(0, subtotal - discountAmount);

		const ivaAmount = subtotal * priceConfig.ivaRate;
		const serviceFee = subtotal * priceConfig.serviceFeeRate;
		const driverEarnings = subtotal - serviceFee;
		const totalPrice = subtotal + ivaAmount;

		return {
			priceConfigId: priceConfig.id,
			pickupZoneId: pickupZone?.id ?? null,
			dropoffZoneId: dropoffZone?.id ?? null,
			estimatedDistanceKm: round(distanceKm, 2),
			estimatedDurationMin: estimatedMinutes,
			surgeMultiplierApplied: round(surgeMultiplier, 2),
			subtotal: round(subtotal, 2),
			ivaAmount: round(ivaAmount, 2),
			serviceFee: round(serviceFee, 2),
			driverEarnings: round(driverEarnings, 2),
			totalPrice: round(totalPrice, 2),
			discountAmount: round(discountAmount, 2),
			couponId,
		};
	}

	private async findZoneForCoords(lat: number, lng: number) {
		try {
			const result = await (
				this.prisma.$queryRawUnsafe as unknown as (
					query: string,
					...params: unknown[]
				) => Promise<ZoneResult[]>
			)(
				`SELECT z.id, z."surgeMultiplier"
				 FROM "Zone" z
				 WHERE z.boundary IS NOT NULL AND z.boundary != ''
				 AND ST_DWithin(
					 ST_GeomFromText(z.boundary, 4326)::geography,
					 ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
					 0
				 ) AND z."isActive" = true
				 LIMIT 1`,
				lng,
				lat,
			);

			return result.length > 0 ? result[0] : null;
		} catch {
			return null;
		}
	}
}

function round(value: number, decimals: number): number {
	const factor = Math.pow(10, decimals);
	return Math.round(value * factor) / factor;
}
