import {
	Injectable,
	NotFoundException,
	BadRequestException,
	ConflictException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ListCouponsDto } from './dto/list-coupons.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

const defaultCouponSelect = {
	id: true,
	code: true,
	description: true,
	discountType: true,
	discountValue: true,
	maxDiscount: true,
	minTripAmount: true,
	startsAt: true,
	expiresAt: true,
	usageLimit: true,
	usageCount: true,
	limitPerUser: true,
	isActive: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
} as const;

@Injectable()
export class CouponsService {
	constructor(
		private prisma: PrismaService,
		private logger: LoggerService,
	) {}

	async create(dto: CreateCouponDto) {
		const existing = await this.prisma.client.coupon.findUnique({
			where: { code: dto.code },
		});

		if (existing) {
			throw new ConflictException('Este código de cupão já existe');
		}

		const coupon = await this.prisma.client.coupon.create({
			data: {
				id: uuidv7(),
				code: dto.code,
				description: dto.description,
				discountType: dto.discountType,
				discountValue: dto.discountValue,
				maxDiscount: dto.maxDiscount,
				minTripAmount: dto.minTripAmount,
				startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
				expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
				usageLimit: dto.usageLimit,
				limitPerUser: dto.limitPerUser ?? 1,
			},
		});

		this.logger.log(
			`Coupon created: ${coupon.code} (${coupon.discountType} ${Number(coupon.discountValue)})`,
			'CouponsService',
		);

		return coupon;
	}

	async list(dto: ListCouponsDto) {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 20;
		const skip = (page - 1) * limit;

		const where: Record<string, unknown> = {};

		if (!dto.includeDeleted) {
			where.deletedAt = null;
		}

		if (dto.search) {
			where.code = { contains: dto.search, mode: 'insensitive' };
		}

		if (dto.isActive !== undefined) {
			where.isActive = dto.isActive;
		}

		if (dto.discountType) {
			where.discountType = dto.discountType;
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

		const [coupons, total] = await Promise.all([
			this.prisma.client.coupon.findMany({
				where,
				skip,
				take: limit,
				orderBy,
				select: defaultCouponSelect,
			}),
			this.prisma.client.coupon.count({ where }),
		]);

		return {
			coupons,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findById(id: string) {
		const coupon = await this.prisma.client.coupon.findUnique({
			where: { id },
			select: defaultCouponSelect,
		});

		if (!coupon) {
			throw new NotFoundException('Cupão não encontrado');
		}

		return coupon;
	}

	async findByCode(code: string) {
		const coupon = await this.prisma.client.coupon.findUnique({
			where: { code },
			select: defaultCouponSelect,
		});

		if (!coupon || coupon.deletedAt) {
			throw new NotFoundException('Cupão não encontrado');
		}

		return coupon;
	}

	async update(id: string, dto: UpdateCouponDto) {
		const coupon = await this.prisma.client.coupon.findUnique({
			where: { id },
		});

		if (!coupon) {
			throw new NotFoundException('Cupão não encontrado');
		}

		if (dto.code && dto.code !== coupon.code) {
			const existing = await this.prisma.client.coupon.findUnique({
				where: { code: dto.code },
			});
			if (existing) {
				throw new ConflictException(
					'Este código de cupão já está em uso',
				);
			}
		}

		const data: Record<string, unknown> = {};

		if (dto.code !== undefined) data.code = dto.code;
		if (dto.description !== undefined) data.description = dto.description;
		if (dto.discountType !== undefined)
			data.discountType = dto.discountType;
		if (dto.discountValue !== undefined)
			data.discountValue = dto.discountValue;
		if (dto.maxDiscount !== undefined) data.maxDiscount = dto.maxDiscount;
		if (dto.minTripAmount !== undefined)
			data.minTripAmount = dto.minTripAmount;
		if (dto.startsAt !== undefined)
			data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
		if (dto.expiresAt !== undefined)
			data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
		if (dto.usageLimit !== undefined) data.usageLimit = dto.usageLimit;
		if (dto.limitPerUser !== undefined)
			data.limitPerUser = dto.limitPerUser;
		if (dto.isActive !== undefined) data.isActive = dto.isActive;

		if (Object.keys(data).length === 0) {
			throw new BadRequestException('Nenhum dado para atualizar');
		}

		const updated = await this.prisma.client.coupon.update({
			where: { id },
			data,
			select: defaultCouponSelect,
		});

		this.logger.log(`Coupon updated: ${updated.code}`, 'CouponsService');

		return updated;
	}

	async remove(id: string) {
		const coupon = await this.prisma.client.coupon.findUnique({
			where: { id },
		});

		if (!coupon || coupon.deletedAt) {
			throw new NotFoundException('Cupão não encontrado');
		}

		await this.prisma.client.coupon.update({
			where: { id },
			data: { deletedAt: new Date() },
		});

		this.logger.log(
			`Coupon soft-deleted: ${coupon.code}`,
			'CouponsService',
		);

		return {
			msg: 'Cupão removido com sucesso',
		};
	}

	async toggleActive(id: string) {
		const coupon = await this.prisma.client.coupon.findUnique({
			where: { id },
		});

		if (!coupon || coupon.deletedAt) {
			throw new NotFoundException('Cupão não encontrado');
		}

		const updated = await this.prisma.client.coupon.update({
			where: { id },
			data: { isActive: !coupon.isActive },
			select: defaultCouponSelect,
		});

		this.logger.log(
			`Coupon ${updated.code} is now ${updated.isActive ? 'active' : 'inactive'}`,
			'CouponsService',
		);

		return updated;
	}

	async validate(dto: ValidateCouponDto) {
		const coupon = await this.prisma.client.coupon.findUnique({
			where: { code: dto.code },
		});

		if (!coupon || coupon.deletedAt) {
			return { valid: false, reason: 'Cupão não encontrado' };
		}

		if (!coupon.isActive) {
			return { valid: false, reason: 'Este cupão está inativo' };
		}

		if (coupon.startsAt && new Date() < coupon.startsAt) {
			return {
				valid: false,
				reason: 'Este cupão ainda não está disponível',
			};
		}

		if (coupon.expiresAt && new Date() > coupon.expiresAt) {
			return { valid: false, reason: 'Este cupão expirou' };
		}

		const tripAmount = dto.tripAmount;

		if (coupon.minTripAmount && Number(coupon.minTripAmount) > 0) {
			if (tripAmount < Number(coupon.minTripAmount)) {
				return {
					valid: false,
					reason: `Valor mínimo da viagem é ${Number(coupon.minTripAmount)} Kz`,
				};
			}
		}

		if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
			return {
				valid: false,
				reason: 'Este cupão já atingiu o limite de usos',
			};
		}

		if (dto.userId) {
			const userUsageCount = await this.prisma.client.trip.count({
				where: {
					couponId: coupon.id,
					clientId: dto.userId,
				},
			});

			if (userUsageCount >= coupon.limitPerUser) {
				return {
					valid: false,
					reason: 'Já usaste este cupão o número máximo de vezes',
				};
			}
		}

		let discountApplied: number;
		if (coupon.discountType === 'PERCENTAGE') {
			const rawDiscount =
				(tripAmount * Number(coupon.discountValue)) / 100;
			discountApplied = coupon.maxDiscount
				? Math.min(rawDiscount, Number(coupon.maxDiscount))
				: rawDiscount;
		} else {
			discountApplied = Math.min(
				Number(coupon.discountValue),
				tripAmount,
			);
		}

		return {
			valid: true,
			coupon: {
				id: coupon.id,
				code: coupon.code,
				discountType: coupon.discountType,
				discountValue: Number(coupon.discountValue),
			},
			discountApplied: Math.round(discountApplied * 100) / 100,
		};
	}

	async findActive() {
		const now = new Date();

		const coupons = await this.prisma.client.coupon.findMany({
			where: {
				isActive: true,
				deletedAt: null,
				startsAt: { lte: now },
				OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
			},
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				code: true,
				description: true,
				discountType: true,
				discountValue: true,
				maxDiscount: true,
				minTripAmount: true,
				startsAt: true,
				expiresAt: true,
				isActive: true,
				createdAt: true,
			},
		});

		return {
			promotions: coupons.map((c) => ({
				...c,
				discountValue: Number(c.discountValue),
				maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
				minTripAmount: c.minTripAmount ? Number(c.minTripAmount) : null,
			})),
		};
	}

	async incrementUsage(id: string) {
		const coupon = await this.prisma.client.coupon.findUnique({
			where: { id },
			select: { usageLimit: true, usageCount: true },
		});

		if (!coupon) return;

		const where: Record<string, unknown> = { id };
		if (coupon.usageLimit) {
			where.usageCount = { lt: coupon.usageLimit };
		}

		const result = await this.prisma.client.coupon.updateMany({
			where,
			data: { usageCount: { increment: 1 } },
		});

		if (result.count === 0) {
			this.logger.warn(
				`Coupon ${id} usage limit reached on concurrent increment`,
			);
		}
	}
}
