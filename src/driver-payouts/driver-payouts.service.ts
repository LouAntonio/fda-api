import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreateDriverPayoutDto } from './dto/create-driver-payout.dto';
import { UpdateDriverPayoutDto } from './dto/update-driver-payout.dto';
import { ListDriverPayoutsDto } from './dto/list-driver-payouts.dto';

const defaultPayoutSelect = {
	id: true,
	driverId: true,
	amount: true,
	processedAt: true,
	reference: true,
	createdAt: true,
	deletedAt: true,
} as const;

@Injectable()
export class DriverPayoutsService {
	constructor(
		private prisma: PrismaService,
		private logger: LoggerService,
	) {}

	async create(dto: CreateDriverPayoutDto) {
		const driver = await this.prisma.client.driver.findUnique({
			where: { id: dto.driverId },
			select: {
				id: true,
				availableBalance: true,
			},
		});

		if (!driver) {
			throw new NotFoundException('Motorista não encontrado');
		}

		if (Number(driver.availableBalance) < dto.amount) {
			throw new BadRequestException(
				'Saldo insuficiente do motorista',
			);
		}

		const payout = await this.prisma.client.driverPayout.create({
			data: {
				id: uuidv7(),
				driverId: dto.driverId,
				amount: dto.amount,
				processedAt: dto.processedAt
					? new Date(dto.processedAt)
					: new Date(),
				reference: dto.reference ?? null,
			},
			select: defaultPayoutSelect,
		});

		await this.prisma.client.driver.update({
			where: { id: dto.driverId },
			data: {
				availableBalance: { decrement: dto.amount },
			},
		});

		this.logger.log(
			`DriverPayout ${payout.id} created for driver ${dto.driverId}, amount ${dto.amount}`,
			'DriverPayoutsService',
		);

		return payout;
	}

	async list(dto: ListDriverPayoutsDto) {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 20;
		const skip = (page - 1) * limit;

		const where: Record<string, unknown> = {};

		if (!dto.includeDeleted) {
			where.deletedAt = null;
		}

		if (dto.driverId) where.driverId = dto.driverId;

		if (dto.search) {
			where.reference = {
				contains: dto.search,
				mode: 'insensitive',
			};
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

		const [payouts, total] = await Promise.all([
			this.prisma.client.driverPayout.findMany({
				where,
				skip,
				take: limit,
				orderBy,
				select: {
					...defaultPayoutSelect,
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
			this.prisma.client.driverPayout.count({ where }),
		]);

		return {
			payouts,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findById(id: string) {
		const payout = await this.prisma.client.driverPayout.findUnique({
			where: { id },
			select: {
				...defaultPayoutSelect,
				driver: {
					select: {
						id: true,
						biNumber: true,
						licenseNumber: true,
						availableBalance: true,
						user: {
							select: {
								id: true,
								name: true,
								surname: true,
								phoneNumber: true,
							},
						},
					},
				},
			},
		});

		if (!payout || payout.deletedAt) {
			throw new NotFoundException('Pagamento não encontrado');
		}

		return payout;
	}

	async update(id: string, dto: UpdateDriverPayoutDto) {
		const payout = await this.prisma.client.driverPayout.findUnique({
			where: { id },
		});

		if (!payout || payout.deletedAt) {
			throw new NotFoundException('Pagamento não encontrado');
		}

		const data: Record<string, unknown> = {};

		if (dto.processedAt !== undefined)
			data.processedAt = new Date(dto.processedAt);
		if (dto.reference !== undefined) data.reference = dto.reference;

		if (Object.keys(data).length === 0) {
			throw new BadRequestException('Nenhum dado para atualizar');
		}

		const updated = await this.prisma.client.driverPayout.update({
			where: { id },
			data,
			select: defaultPayoutSelect,
		});

		this.logger.log(
			`DriverPayout ${id} updated`,
			'DriverPayoutsService',
		);

		return updated;
	}

	async remove(id: string) {
		const payout = await this.prisma.client.driverPayout.findUnique({
			where: { id },
		});

		if (!payout || payout.deletedAt) {
			throw new NotFoundException('Pagamento não encontrado');
		}

		await this.prisma.client.driverPayout.update({
			where: { id },
			data: { deletedAt: new Date() },
		});

		this.logger.log(
			`DriverPayout ${id} soft-deleted`,
			'DriverPayoutsService',
		);

		return {
			msg: 'Pagamento removido com sucesso',
		};
	}
}
