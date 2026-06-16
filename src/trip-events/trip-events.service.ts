import {
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreateTripEventDto } from './dto/create-trip-event.dto';
import { ListTripEventsDto } from './dto/list-trip-events.dto';

const defaultEventSelect = {
	id: true,
	tripId: true,
	type: true,
	actorUserId: true,
	metadata: true,
	createdAt: true,
} as const;

@Injectable()
export class TripEventsService {
	constructor(
		private prisma: PrismaService,
		private logger: LoggerService,
	) {}

	async create(dto: CreateTripEventDto) {
		const trip = await this.prisma.client.trip.findUnique({
			where: { id: dto.tripId },
			select: { id: true },
		});

		if (!trip) {
			throw new NotFoundException('Viagem não encontrada');
		}

		const event = await (this.prisma.client.tripEvent as any).create({
			data: {
				id: uuidv7(),
				tripId: dto.tripId,
				type: dto.type,
				actorUserId: dto.actorUserId ?? null,
				metadata: dto.metadata ?? undefined,
			},
			select: defaultEventSelect,
		});

		this.logger.log(
			`TripEvent ${event.id} created for trip ${dto.tripId}: ${dto.type}`,
			'TripEventsService',
		);

		return event;
	}

	async list(dto: ListTripEventsDto) {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 50;
		const skip = (page - 1) * limit;

		const where: Record<string, unknown> = {};

		if (dto.tripId) where.tripId = dto.tripId;
		if (dto.type) where.type = dto.type;

		if (dto.dateFrom || dto.dateTo) {
			where.createdAt = {};
			if (dto.dateFrom) {
				(where.createdAt as Record<string, unknown>).gte =
					new Date(dto.dateFrom);
			}
			if (dto.dateTo) {
				(where.createdAt as Record<string, unknown>).lte =
					new Date(dto.dateTo);
			}
		}

		const orderBy: Record<string, string> = {};
		orderBy[dto.sortBy ?? 'createdAt'] = dto.sortOrder ?? 'asc';

		const [events, total] = await Promise.all([
			(this.prisma.client.tripEvent as any).findMany({
				where,
				skip,
				take: limit,
				orderBy,
				select: defaultEventSelect,
			}) as Promise<any[]>,
			(this.prisma.client.tripEvent as any).count({
				where,
			}) as Promise<number>,
		]);

		return {
			events,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findById(id: string) {
		const event = await (this.prisma.client.tripEvent as any).findUnique({
			where: { id },
			select: {
				...defaultEventSelect,
				trip: {
					select: {
						id: true,
						status: true,
					},
				},
			},
		});

		if (!event) {
			throw new NotFoundException('Evento não encontrado');
		}

		return event;
	}
}
