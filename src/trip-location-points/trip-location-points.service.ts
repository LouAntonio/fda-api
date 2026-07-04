import { Injectable, NotFoundException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { TripGatewayService } from '../trip-gateway/trip-gateway.service';
import { CreateTripLocationPointDto } from './dto/create-trip-location-point.dto';
import { ListTripLocationPointsDto } from './dto/list-trip-location-points.dto';
import { coordsToWkt } from '../common/helpers/coords.helper';

const defaultLocationPointSelect = {
	id: true,
	tripId: true,
	speed: true,
	heading: true,
	recordedAt: true,
} as const;

@Injectable()
export class TripLocationPointsService {
	constructor(
		private prisma: PrismaService,
		private logger: LoggerService,
		private tripGateway: TripGatewayService,
	) {}

	async create(dto: CreateTripLocationPointDto) {
		const trip = await this.prisma.client.trip.findUnique({
			where: { id: dto.tripId },
			select: { id: true },
		});

		if (!trip) {
			throw new NotFoundException('Viagem não encontrada');
		}

		const point = await this.prisma.client.tripLocationPoint.create({
			data: {
				id: uuidv7(),
				tripId: dto.tripId,
				location: coordsToWkt(dto.lat, dto.lng),
				speed: dto.speed ?? null,
				heading: dto.heading ?? null,
				recordedAt: dto.recordedAt
					? new Date(dto.recordedAt)
					: undefined,
			},
			select: defaultLocationPointSelect,
		});

		this.tripGateway.emitDriverLocation(
			dto.tripId,
			dto.lat,
			dto.lng,
			dto.speed,
			dto.heading,
		);

		this.logger.log(
			`TripLocationPoint ${point.id} recorded for trip ${dto.tripId}`,
			'TripLocationPointsService',
		);

		return point;
	}

	async list(dto: ListTripLocationPointsDto) {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 100;
		const skip = (page - 1) * limit;

		const where: Prisma.TripLocationPointWhereInput = {};

		if (dto.tripId) where.tripId = dto.tripId;

		if (dto.dateFrom || dto.dateTo) {
			where.recordedAt = {};
			if (dto.dateFrom) {
				where.recordedAt.gte = new Date(dto.dateFrom);
			}
			if (dto.dateTo) {
				where.recordedAt.lte = new Date(dto.dateTo);
			}
		}

		const orderBy: Record<string, 'asc' | 'desc'> = {};
		orderBy[dto.sortBy ?? 'recordedAt'] = dto.sortOrder ?? 'asc';

		const [points, total] = await Promise.all([
			this.prisma.client.tripLocationPoint.findMany({
				where,
				skip,
				take: limit,
				orderBy,
				select: defaultLocationPointSelect,
			}),
			this.prisma.client.tripLocationPoint.count({
				where,
			}),
		]);

		return {
			points,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findById(id: string) {
		const point = await this.prisma.client.tripLocationPoint.findUnique({
			where: { id },
			select: {
				...defaultLocationPointSelect,
				trip: {
					select: {
						id: true,
						status: true,
					},
				},
			},
		});

		if (!point) {
			throw new NotFoundException('Ponto de localização não encontrado');
		}

		return point;
	}

	async remove(id: string) {
		const point = await this.prisma.client.tripLocationPoint.findUnique({
			where: { id },
		});

		if (!point) {
			throw new NotFoundException('Ponto de localização não encontrado');
		}

		await this.prisma.client.tripLocationPoint.delete({
			where: { id },
		});

		this.logger.log(
			`TripLocationPoint ${id} deleted`,
			'TripLocationPointsService',
		);

		return {
			msg: 'Ponto de localização removido com sucesso',
		};
	}
}
