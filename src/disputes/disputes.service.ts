import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { ListDisputesDto } from './dto/list-disputes.dto';

const defaultDisputeSelect = {
	id: true,
	tripId: true,
	openedByUserId: true,
	reason: true,
	description: true,
	resolution: true,
	resolvedAt: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
} as const;

@Injectable()
export class DisputesService {
	constructor(
		private prisma: PrismaService,
		private logger: LoggerService,
	) {}

	async create(dto: CreateDisputeDto, openedByUserId: string) {
		const trip = await this.prisma.client.trip.findUnique({
			where: { id: dto.tripId },
			select: { id: true, deletedAt: true },
		});

		if (!trip || trip.deletedAt) {
			throw new NotFoundException('Viagem não encontrada');
		}

		const dispute = await this.prisma.client.dispute.create({
			data: {
				id: uuidv7(),
				tripId: dto.tripId,
				openedByUserId,
				reason: dto.reason,
				description: dto.description ?? null,
			},
			select: defaultDisputeSelect,
		});

		this.logger.log(
			`Dispute ${dispute.id} opened for trip ${dto.tripId}: ${dto.reason}`,
			'DisputesService',
		);

		return dispute;
	}

	async list(dto: ListDisputesDto) {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 20;
		const skip = (page - 1) * limit;

		const where: Record<string, unknown> = {};

		if (!dto.includeDeleted) {
			where.deletedAt = null;
		}

		if (dto.tripId) where.tripId = dto.tripId;
		if (dto.openedByUserId) where.openedByUserId = dto.openedByUserId;

		if (dto.isResolved !== undefined) {
			if (dto.isResolved) {
				where.resolvedAt = { not: null };
			} else {
				where.resolvedAt = null;
			}
		}

		const orderBy: Record<string, string> = {};
		orderBy[dto.sortBy ?? 'createdAt'] = dto.sortOrder ?? 'desc';

		const [disputes, total] = await Promise.all([
			this.prisma.client.dispute.findMany({
				where,
				skip,
				take: limit,
				orderBy,
				select: {
					...defaultDisputeSelect,
					trip: {
						select: {
							id: true,
							status: true,
							pickupAddress: true,
							dropoffAddress: true,
						},
					},
				},
			}),
			this.prisma.client.dispute.count({ where }),
		]);

		return {
			disputes,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findById(id: string) {
		const dispute = await this.prisma.client.dispute.findUnique({
			where: { id },
			select: {
				...defaultDisputeSelect,
				trip: {
					select: {
						id: true,
						status: true,
						pickupAddress: true,
						dropoffAddress: true,
						totalPrice: true,
					},
				},
			},
		});

		if (!dispute || dispute.deletedAt) {
			throw new NotFoundException('Disputa não encontrada');
		}

		return dispute;
	}

	async resolve(id: string, dto: ResolveDisputeDto) {
		const dispute = await this.prisma.client.dispute.findUnique({
			where: { id },
		});

		if (!dispute || dispute.deletedAt) {
			throw new NotFoundException('Disputa não encontrada');
		}

		if (dispute.resolvedAt) {
			throw new BadRequestException('Disputa já se encontra resolvida');
		}

		const updated = await this.prisma.client.dispute.update({
			where: { id },
			data: {
				resolution: dto.resolution,
				resolvedAt: new Date(),
			},
			select: defaultDisputeSelect,
		});

		this.logger.log(
			`Dispute ${id} resolved: ${dto.resolution}`,
			'DisputesService',
		);

		return updated;
	}

	async remove(id: string) {
		const dispute = await this.prisma.client.dispute.findUnique({
			where: { id },
		});

		if (!dispute || dispute.deletedAt) {
			throw new NotFoundException('Disputa não encontrada');
		}

		await this.prisma.client.dispute.update({
			where: { id },
			data: { deletedAt: new Date() },
		});

		this.logger.log(`Dispute ${id} soft-deleted`, 'DisputesService');

		return {
			msg: 'Disputa removida com sucesso',
		};
	}
}
