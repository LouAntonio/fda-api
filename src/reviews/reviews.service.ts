import {
	Injectable,
	NotFoundException,
	BadRequestException,
	ConflictException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { TripStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ListReviewsDto } from './dto/list-reviews.dto';

const defaultReviewSelect = {
	id: true,
	tripId: true,
	fromUserId: true,
	toUserId: true,
	rating: true,
	comment: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
} as const;

@Injectable()
export class ReviewsService {
	constructor(
		private prisma: PrismaService,
		private logger: LoggerService,
	) {}

	async create(dto: CreateReviewDto) {
		if (dto.fromUserId === dto.toUserId) {
			throw new BadRequestException('Não pode avaliar a si próprio');
		}

		const trip = await this.prisma.client.trip.findUnique({
			where: { id: dto.tripId },
			select: {
				id: true,
				status: true,
				deletedAt: true,
			},
		});

		if (!trip || trip.deletedAt) {
			throw new NotFoundException('Viagem não encontrada');
		}

		if (trip.status !== TripStatus.COMPLETED) {
			throw new BadRequestException(
				'Apenas viagens concluídas podem ser avaliadas',
			);
		}

		const existing = await this.prisma.client.review.findUnique({
			where: {
				tripId_fromUserId: {
					tripId: dto.tripId,
					fromUserId: dto.fromUserId,
				},
			},
		});

		if (existing) {
			throw new ConflictException(
				'Já existe uma avaliação sua para esta viagem',
			);
		}

		const review = await this.prisma.client.review.create({
			data: {
				id: uuidv7(),
				tripId: dto.tripId,
				fromUserId: dto.fromUserId,
				toUserId: dto.toUserId,
				rating: dto.rating,
				comment: dto.comment ?? null,
			},
			select: defaultReviewSelect,
		});

		await this.recalculateDriverRating(dto.toUserId);

		this.logger.log(
			`Review ${review.id} created for trip ${dto.tripId}: rating ${dto.rating}`,
			'ReviewsService',
		);

		return review;
	}

	async list(dto: ListReviewsDto) {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 20;
		const skip = (page - 1) * limit;

		const where: Record<string, unknown> = {};

		if (!dto.includeDeleted) {
			where.deletedAt = null;
		}

		if (dto.tripId) where.tripId = dto.tripId;
		if (dto.fromUserId) where.fromUserId = dto.fromUserId;
		if (dto.toUserId) where.toUserId = dto.toUserId;

		if (dto.ratingMin !== undefined || dto.ratingMax !== undefined) {
			where.rating = {};
			if (dto.ratingMin !== undefined) {
				(where.rating as Record<string, unknown>).gte = dto.ratingMin;
			}
			if (dto.ratingMax !== undefined) {
				(where.rating as Record<string, unknown>).lte = dto.ratingMax;
			}
		}

		const orderBy: Record<string, string> = {};
		orderBy[dto.sortBy ?? 'createdAt'] = dto.sortOrder ?? 'desc';

		const [reviews, total] = await Promise.all([
			this.prisma.client.review.findMany({
				where,
				skip,
				take: limit,
				orderBy,
				select: {
					...defaultReviewSelect,
					fromUser: {
						select: {
							id: true,
							name: true,
							surname: true,
						},
					},
					toUser: {
						select: {
							id: true,
							name: true,
							surname: true,
						},
					},
					trip: {
						select: {
							id: true,
							status: true,
						},
					},
				},
			}),
			this.prisma.client.review.count({ where }),
		]);

		return {
			reviews,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findById(id: string) {
		const review = await this.prisma.client.review.findUnique({
			where: { id },
			select: {
				...defaultReviewSelect,
				fromUser: {
					select: {
						id: true,
						name: true,
						surname: true,
						image: true,
					},
				},
				toUser: {
					select: {
						id: true,
						name: true,
						surname: true,
						image: true,
					},
				},
				trip: {
					select: {
						id: true,
						status: true,
						serviceType: true,
						pickupAddress: true,
						dropoffAddress: true,
					},
				},
			},
		});

		if (!review || review.deletedAt) {
			throw new NotFoundException('Avaliação não encontrada');
		}

		return review;
	}

	async update(id: string, dto: UpdateReviewDto) {
		const review = await this.prisma.client.review.findUnique({
			where: { id },
		});

		if (!review || review.deletedAt) {
			throw new NotFoundException('Avaliação não encontrada');
		}

		const data: Record<string, unknown> = {};

		if (dto.rating !== undefined) data.rating = dto.rating;
		if (dto.comment !== undefined) data.comment = dto.comment;

		if (Object.keys(data).length === 0) {
			throw new BadRequestException('Nenhum dado para atualizar');
		}

		const updated = await this.prisma.client.review.update({
			where: { id },
			data,
			select: defaultReviewSelect,
		});

		await this.recalculateDriverRating(review.toUserId);

		this.logger.log(`Review ${id} updated`, 'ReviewsService');

		return updated;
	}

	async remove(id: string) {
		const review = await this.prisma.client.review.findUnique({
			where: { id },
		});

		if (!review || review.deletedAt) {
			throw new NotFoundException('Avaliação não encontrada');
		}

		await this.prisma.client.review.update({
			where: { id },
			data: { deletedAt: new Date() },
		});

		await this.recalculateDriverRating(review.toUserId);

		this.logger.log(`Review ${id} soft-deleted`, 'ReviewsService');

		return {
			msg: 'Avaliação removida com sucesso',
		};
	}

	private async recalculateDriverRating(userId: string) {
		const driver = await this.prisma.client.driver.findUnique({
			where: { userId },
			select: { id: true },
		});

		if (!driver) return;

		const stats = await this.prisma.client.review.aggregate({
			where: {
				toUserId: userId,
				deletedAt: null,
			},
			_avg: { rating: true },
			_count: true,
		});

		await this.prisma.client.driver.update({
			where: { id: driver.id },
			data: {
				ratingAverage: stats._avg.rating ?? 5.0,
				ratingCount: stats._count,
			},
		});
	}
}
