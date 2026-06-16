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
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CouponsService } from '../coupons/coupons.service';
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
	pickupAddress: true,
	dropoffAddress: true,
	estimatedDistanceKm: true,
	estimatedDurationMin: true,
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
};

const statusEventMap: Record<TripStatus, TripEventType> = {
	[TripStatus.REQUESTED]: TripEventType.TRIP_REQUESTED,
	[TripStatus.ACCEPTED]: TripEventType.DRIVER_ACCEPTED,
	[TripStatus.PICKUP_IN_PROGRESS]: TripEventType.DRIVER_ARRIVED_PICKUP,
	[TripStatus.STARTED]: TripEventType.TRIP_STARTED,
	[TripStatus.COMPLETED]: TripEventType.TRIP_COMPLETED,
	[TripStatus.CANCELLED]: TripEventType.TRIP_CANCELLED,
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
	[TripStatus.PICKUP_IN_PROGRESS]: 'requestedAt',
	[TripStatus.STARTED]: 'startedAt',
	[TripStatus.COMPLETED]: 'completedAt',
	[TripStatus.CANCELLED]: 'cancelledAt',
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
	) {}

	async create(dto: CreateTripDto, userId: string, userRole: UserRole) {
		/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
		let clientId = userId;

		if (userRole !== UserRole.CLIENT && dto['clientId']) {
			clientId = dto['clientId'] as string;
		}

		if (dto.idempotencyKey) {
			const existing = await (this.prisma.client.trip as any).findUnique({
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

		const tripData: Record<string, unknown> = {
			id: uuidv7(),
			clientId,
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
			priceConfigId: estimate.priceConfigId,
			pickupZoneId: estimate.pickupZoneId,
			dropoffZoneId: estimate.dropoffZoneId,
			surgeMultiplierApplied: estimate.surgeMultiplierApplied,
			subtotal: estimate.subtotal,
			ivaAmount: estimate.ivaAmount,
			serviceFee: estimate.serviceFee,
			driverEarnings: estimate.driverEarnings,
			totalPrice: estimate.totalPrice,
			discountAmount: estimate.discountAmount,
			couponId: estimate.couponId ?? null,
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

		const trip = await (this.prisma.client.trip as any).create({
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
			await (this.prisma.client.deliveryDetails as any).create({
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

		this.logger.log(
			`Trip ${trip.id} created for client ${clientId} (${dto.serviceType})`,
			'TripsService',
		);

		return trip;
		/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
	}

	async list(dto: ListTripsDto, userId: string, userRole: UserRole) {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 20;
		const skip = (page - 1) * limit;

		const where: Record<string, unknown> = {};

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
				where.id = null;
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
			where.createdAt = {};
			if (dto.dateFrom) {
				(where.createdAt as Record<string, unknown>).gte = new Date(
					dto.dateFrom,
				);
			}
			if (dto.dateTo) {
				(where.createdAt as Record<string, unknown>).lte = new Date(
					dto.dateTo,
				);
			}
		}

		const orderBy: Record<string, string> = {};
		orderBy[dto.sortBy ?? 'createdAt'] = dto.sortOrder ?? 'desc';

		/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
		const [trips, total] = await Promise.all([
			(this.prisma.client.trip as any).findMany({
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
			}) as Promise<any[]>,
			(this.prisma.client.trip as any).count({
				where,
			}) as Promise<number>,
		]);
		/* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

		return {
			trips,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findById(id: string, userId: string, userRole: UserRole) {
		/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
		const trip = await (this.prisma.client.trip as any).findUnique({
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

		if (userRole === UserRole.CLIENT && trip.clientId !== userId) {
			throw new ForbiddenException(
				'Não tem permissão para ver esta viagem',
			);
		}

		if (userRole === UserRole.DRIVER && trip.driverId) {
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

		return trip;
		/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
	}

	async update(id: string, dto: UpdateTripDto) {
		/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
		const trip = await (this.prisma.client.trip as any).findUnique({
			where: { id },
		});

		if (!trip || trip.deletedAt) {
			throw new NotFoundException('Viagem não encontrada');
		}

		const data: Record<string, unknown> = {};

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

		const updated = await (this.prisma.client.trip as any).update({
			where: { id },
			data,
			select: defaultTripSelect,
		});

		this.logger.log(`Trip ${id} updated`, 'TripsService');

		return updated;
		/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
	}

	async remove(id: string) {
		/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
		const trip = await (this.prisma.client.trip as any).findUnique({
			where: { id },
		});

		if (!trip || trip.deletedAt) {
			throw new NotFoundException('Viagem não encontrada');
		}

		await (this.prisma.client.trip as any).update({
			where: { id },
			data: { deletedAt: new Date() },
		});

		this.logger.log(`Trip ${id} soft-deleted`, 'TripsService');

		return {
			msg: 'Viagem removida com sucesso',
		};
		/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
	}

	async updateStatus(
		id: string,
		dto: UpdateTripStatusDto,
		actorUserId: string,
		userRole: UserRole,
	) {
		/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
		const trip = await (this.prisma.client.trip as any).findUnique({
			where: { id },
		});

		if (!trip || trip.deletedAt) {
			throw new NotFoundException('Viagem não encontrada');
		}

		const currentStatus = trip.status as TripStatus;
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

		const updateData: Record<string, unknown> = {
			status: nextStatus,
		};

		const timestampField = statusTimestampField[nextStatus];
		if (timestampField) {
			updateData[timestampField] = new Date();
		}

		if (nextStatus === TripStatus.CANCELLED) {
			updateData.cancelReason = dto.cancelReason ?? null;
			updateData.cancelledByUserId = actorUserId;
		}

		const updated = await (this.prisma.client.trip as any).update({
			where: { id },
			data: updateData,
			select: {
				...defaultTripSelect,
				cancelReason: true,
			},
		});

		if (nextStatus === TripStatus.COMPLETED && trip.driverId) {
			await this.prisma.client.driver.update({
				where: { id: trip.driverId },
				data: {
					completedTripsCount: { increment: 1 },
					availableBalance: {
						increment: Number(trip.driverEarnings ?? 0),
					},
				},
			});
		}

		if (nextStatus === TripStatus.CANCELLED && trip.driverId) {
			await this.prisma.client.driver.update({
				where: { id: trip.driverId },
				data: {
					cancelledTripsCount: { increment: 1 },
				},
			});
		}

		await this.createTripEvent(id, statusEventMap[nextStatus], actorUserId);

		this.logger.log(
			`Trip ${id} status: ${currentStatus} -> ${nextStatus}`,
			'TripsService',
		);

		return updated;
		/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
	}

	async updateDeliveryStatus(
		id: string,
		dto: UpdateDeliveryStatusDto,
		actorUserId: string,
	) {
		/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
		const trip = await (this.prisma.client.trip as any).findUnique({
			where: { id },
		});

		if (!trip || trip.deletedAt) {
			throw new NotFoundException('Viagem não encontrada');
		}

		if (trip.serviceType !== ServiceType.DELIVERY) {
			throw new BadRequestException('Esta viagem não é do tipo entrega');
		}

		const currentDeliveryStatus =
			trip.deliveryStatus as DeliveryStatus | null;
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

		const updated = await (this.prisma.client.trip as any).update({
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

		this.logger.log(
			`Trip ${id} delivery status: ${currentDeliveryStatus} -> ${nextDeliveryStatus}`,
			'TripsService',
		);

		return updated;
		/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
	}

	async cancel(
		id: string,
		cancelReason: string,
		userId: string,
		userRole: UserRole,
	) {
		/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
		const trip = await (this.prisma.client.trip as any).findUnique({
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

		if (
			!this.isValidTransition(
				trip.status as TripStatus,
				TripStatus.CANCELLED,
			)
		) {
			throw new BadRequestException(
				`Viagem em estado ${trip.status} não pode ser cancelada`,
			);
		}

		const updated = await (this.prisma.client.trip as any).update({
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

		this.logger.log(
			`Trip ${id} cancelled by ${userId}: ${cancelReason}`,
			'TripsService',
		);

		return updated;
		/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
	}

	async updatePayment(id: string, dto: UpdatePaymentStatusDto) {
		/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
		const trip = await (this.prisma.client.trip as any).findUnique({
			where: { id },
		});

		if (!trip || trip.deletedAt) {
			throw new NotFoundException('Viagem não encontrada');
		}

		const updated = await (this.prisma.client.trip as any).update({
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
			await (this.prisma.client.financialTransaction as any).create({
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

		this.logger.log(
			`Trip ${id} payment status: ${trip.paymentStatus} -> ${dto.paymentStatus}`,
			'TripsService',
		);

		return updated;
		/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
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
			day: 'DATE',
			week: "DATE_TRUNC('week'",
			month: "DATE_TRUNC('month'",
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
				${truncFn}("createdAt")) as period,
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
		/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
		const trip = await (this.prisma.client.trip as any).findUnique({
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

		const events = await (this.prisma.client.tripEvent as any).findMany({
			where: { tripId: id },
			orderBy: { createdAt: 'asc' },
		});

		return events;
		/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
	}

	private isValidTransition(current: TripStatus, next: TripStatus): boolean {
		return validTransitions[current]?.includes(next) ?? false;
	}

	private async createTripEvent(
		tripId: string,
		type: TripEventType,
		actorUserId?: string,
	) {
		/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
		await (this.prisma.client.tripEvent as any).create({
			data: {
				id: uuidv7(),
				tripId,
				type,
				actorUserId: actorUserId ?? null,
			},
		});
		/* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
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
		const result = await (
			this.prisma.$queryRawUnsafe as unknown as (
				query: string,
				...params: unknown[]
			) => Promise<ZoneResult[]>
		)(
			`SELECT z.id, z."surgeMultiplier"
			 FROM "Zone" z
			 WHERE ST_Within(
				 ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
				 z.boundary
			 ) AND z."isActive" = true
			 LIMIT 1`,
			lng,
			lat,
		);

		return result.length > 0 ? result[0] : null;
	}
}

function round(value: number, decimals: number): number {
	const factor = Math.pow(10, decimals);
	return Math.round(value * factor) / factor;
}
