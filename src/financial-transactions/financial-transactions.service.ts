import {
	Injectable,
	NotFoundException,
	BadRequestException,
	ConflictException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import {
	FinancialTransactionStatus,
	PaymentStatus,
	PaymentMethod,
	TripStatus,
	Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreateFinancialTransactionDto } from './dto/create-financial-transaction.dto';
import { UpdateFinancialTransactionDto } from './dto/update-financial-transaction.dto';
import { ListFinancialTransactionsDto } from './dto/list-financial-transactions.dto';
import { UpdateFinancialTransactionStatusDto } from './dto/update-financial-transaction-status.dto';
import { RegisterCashCollectionDto } from './dto/register-cash-collection.dto';

const defaultTransactionSelect = {
	id: true,
	idempotencyKey: true,
	tripId: true,
	userId: true,
	driverId: true,
	type: true,
	status: true,
	amount: true,
	taxAmount: true,
	currency: true,
	description: true,
	externalReference: true,
	metadata: true,
	createdAt: true,
	deletedAt: true,
} as const;

@Injectable()
export class FinancialTransactionsService {
	constructor(
		private prisma: PrismaService,
		private logger: LoggerService,
	) {}

	async create(dto: CreateFinancialTransactionDto) {
		if (dto.tripId) {
			const trip = await this.prisma.client.trip.findUnique({
				where: { id: dto.tripId },
				select: { id: true },
			});
			if (!trip) {
				throw new NotFoundException('Viagem não encontrada');
			}
		}

		if (dto.userId) {
			const user = await this.prisma.client.user.findUnique({
				where: { id: dto.userId },
				select: { id: true },
			});
			if (!user) {
				throw new NotFoundException('Utilizador não encontrado');
			}
		}

		if (dto.driverId) {
			const driver = await this.prisma.client.driver.findUnique({
				where: { id: dto.driverId },
				select: { id: true },
			});
			if (!driver) {
				throw new NotFoundException('Motorista não encontrado');
			}
		}

		let transaction;
		try {
			transaction =
				await this.prisma.client.financialTransaction.create({
					data: {
						id: uuidv7(),
						tripId: dto.tripId ?? null,
						userId: dto.userId ?? null,
						driverId: dto.driverId ?? null,
						type: dto.type,
						status: dto.status ?? FinancialTransactionStatus.PENDING,
						amount: dto.amount,
						taxAmount: dto.taxAmount ?? null,
						currency: dto.currency ?? 'AOA',
						description: dto.description ?? null,
						externalReference: dto.externalReference ?? null,
						idempotencyKey: dto.idempotencyKey ?? null,
						metadata: (dto.metadata ?? undefined) as any,
					},
					select: defaultTransactionSelect,
				});
		} catch (err) {
			if (
				err instanceof Prisma.PrismaClientKnownRequestError &&
				err.code === 'P2002'
			) {
				throw new ConflictException(
					'Já existe uma transação com esta chave de idempotência',
				);
			}
			throw err;
		}

		this.logger.log(
			`FinancialTransaction ${transaction.id} created: ${transaction.type} ${Number(transaction.amount)} ${transaction.currency}`,
			'FinancialTransactionsService',
		);

		return transaction;
	}

	async list(dto: ListFinancialTransactionsDto) {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 20;
		const skip = (page - 1) * limit;

		const where: Record<string, unknown> = {};

		if (!dto.includeDeleted) {
			where.deletedAt = null;
		}

		if (dto.tripId) where.tripId = dto.tripId;
		if (dto.userId) where.userId = dto.userId;
		if (dto.driverId) where.driverId = dto.driverId;
		if (dto.type) where.type = dto.type;
		if (dto.status) where.status = dto.status;

		if (dto.search) {
			where.description = {
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

		const [transactions, total] = await Promise.all([
			this.prisma.client.financialTransaction.findMany({
				where,
				skip,
				take: limit,
				orderBy,
				select: {
					...defaultTransactionSelect,
					trip: {
						select: {
							id: true,
							status: true,
							totalPrice: true,
						},
					},
					user: {
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
			this.prisma.client.financialTransaction.count({ where }),
		]);

		return {
			transactions,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findById(id: string) {
		const transaction =
			await this.prisma.client.financialTransaction.findUnique({
				where: { id },
				select: {
					...defaultTransactionSelect,
					trip: {
						select: {
							id: true,
							status: true,
							totalPrice: true,
							pickupAddress: true,
							dropoffAddress: true,
							paymentMethod: true,
							paymentStatus: true,
						},
					},
					user: {
						select: {
							id: true,
							name: true,
							surname: true,
							email: true,
							phoneNumber: true,
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
								},
							},
						},
					},
				},
			});

		if (!transaction || transaction.deletedAt) {
			throw new NotFoundException('Transação não encontrada');
		}

		return transaction;
	}

	async update(id: string, dto: UpdateFinancialTransactionDto) {
		const transaction =
			await this.prisma.client.financialTransaction.findUnique({
				where: { id },
			});

		if (!transaction || transaction.deletedAt) {
			throw new NotFoundException('Transação não encontrada');
		}

		const data: Record<string, unknown> = {};

		if (dto.type !== undefined) data.type = dto.type;
		if (dto.amount !== undefined) data.amount = dto.amount;
		if (dto.tripId !== undefined) data.tripId = dto.tripId;
		if (dto.userId !== undefined) data.userId = dto.userId;
		if (dto.driverId !== undefined) data.driverId = dto.driverId;
		if (dto.status !== undefined) data.status = dto.status;
		if (dto.taxAmount !== undefined) data.taxAmount = dto.taxAmount;
		if (dto.currency !== undefined) data.currency = dto.currency;
		if (dto.description !== undefined) data.description = dto.description;
		if (dto.externalReference !== undefined)
			data.externalReference = dto.externalReference;
		if (dto.metadata !== undefined) data.metadata = dto.metadata;

		if (Object.keys(data).length === 0) {
			throw new BadRequestException('Nenhum dado para atualizar');
		}

		const updated = await this.prisma.client.financialTransaction.update({
			where: { id },
			data,
			select: defaultTransactionSelect,
		});

		this.logger.log(
			`FinancialTransaction ${id} updated`,
			'FinancialTransactionsService',
		);

		return updated;
	}

	async updateStatus(id: string, dto: UpdateFinancialTransactionStatusDto) {
		const transaction =
			await this.prisma.client.financialTransaction.findUnique({
				where: { id },
			});

		if (!transaction || transaction.deletedAt) {
			throw new NotFoundException('Transação não encontrada');
		}

		if (dto.status === transaction.status) {
			throw new BadRequestException(
				`O estado já está definido como ${dto.status}`,
			);
		}

		const updated = await this.prisma.client.financialTransaction.update({
			where: { id },
			data: { status: dto.status },
			select: defaultTransactionSelect,
		});

		this.logger.log(
			`FinancialTransaction ${id} status: ${transaction.status} -> ${dto.status}`,
			'FinancialTransactionsService',
		);

		return updated;
	}

	async remove(id: string) {
		const transaction =
			await this.prisma.client.financialTransaction.findUnique({
				where: { id },
			});

		if (!transaction || transaction.deletedAt) {
			throw new NotFoundException('Transação não encontrada');
		}

		await this.prisma.client.financialTransaction.update({
			where: { id },
			data: { deletedAt: new Date() },
		});

		this.logger.log(
			`FinancialTransaction ${id} soft-deleted`,
			'FinancialTransactionsService',
		);

		return {
			msg: 'Transação removida com sucesso',
		};
	}

	async registerCashCollection(dto: RegisterCashCollectionDto) {
		const trip = await this.prisma.client.trip.findUnique({
			where: { id: dto.tripId },
			select: {
				id: true,
				status: true,
				paymentMethod: true,
				paymentStatus: true,
				totalPrice: true,
				driverId: true,
				driverEarnings: true,
				deletedAt: true,
			},
		});

		if (!trip || trip.deletedAt) {
			throw new NotFoundException('Viagem não encontrada');
		}

		if (trip.status !== TripStatus.COMPLETED) {
			throw new BadRequestException(
				'A viagem precisa estar COMPLETED para registar recolha de cash',
			);
		}

		if (trip.paymentMethod !== PaymentMethod.CASH) {
			throw new BadRequestException('Esta viagem não foi paga em cash');
		}

		if (trip.paymentStatus === PaymentStatus.PAID) {
			throw new BadRequestException('Esta viagem já foi paga');
		}

		if (trip.driverId !== dto.driverId) {
			throw new BadRequestException(
				'O motorista não corresponde ao motorista da viagem',
			);
		}

		const amount = dto.amount ?? Number(trip.totalPrice);

		const transaction =
			await this.prisma.client.financialTransaction.create({
				data: {
					id: uuidv7(),
					tripId: trip.id,
					driverId: dto.driverId,
					type: 'CASH_COLLECTION',
					status: FinancialTransactionStatus.COMPLETED,
					amount,
					currency: 'AOA',
					description:
						dto.notes ?? `Recolha de cash - viagem ${trip.id}`,
				},
				select: defaultTransactionSelect,
			});

		await this.prisma.client.trip.update({
			where: { id: trip.id },
			data: {
				paymentStatus: PaymentStatus.PAID,
			},
		});

		await this.prisma.client.driver.update({
			where: { id: dto.driverId },
			data: {
				pendingBalance: { increment: amount },
			},
		});

		this.logger.log(
			`Cash collection registered: ${transaction.id} for trip ${trip.id}, amount ${amount} Kz`,
			'FinancialTransactionsService',
		);

		return transaction;
	}
}
