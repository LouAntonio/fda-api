import {
	Injectable,
	NotFoundException,
	BadRequestException,
	ConflictException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreatePriceConfigDto } from './dto/create-price-config.dto';
import { UpdatePriceConfigDto } from './dto/update-price-config.dto';
import { ListPriceConfigsDto } from './dto/list-price-configs.dto';

const defaultPriceConfigSelect = {
	id: true,
	vehicleType: true,
	baseFare: true,
	pricePerKm: true,
	pricePerMin: true,
	minFare: true,
	ivaRate: true,
	serviceFeeRate: true,
	isActive: true,
	createdAt: true,
} as const;

@Injectable()
export class PriceConfigService {
	constructor(
		private prisma: PrismaService,
		private logger: LoggerService,
	) {}

	async create(dto: CreatePriceConfigDto) {
		const existing = await this.prisma.client.priceConfig.findFirst({
			where: {
				vehicleType: dto.vehicleType,
				isActive: true,
			},
		});

		if (existing) {
			throw new ConflictException(
				`Já existe uma configuração ativa para o tipo ${dto.vehicleType}`,
			);
		}

		const priceConfig = await this.prisma.client.priceConfig.create({
			data: {
				id: uuidv7(),
				vehicleType: dto.vehicleType,
				baseFare: dto.baseFare,
				pricePerKm: dto.pricePerKm,
				pricePerMin: dto.pricePerMin,
				minFare: dto.minFare,
				ivaRate: dto.ivaRate ?? 0.14,
				serviceFeeRate: dto.serviceFeeRate ?? 0.15,
				isActive: dto.isActive ?? true,
			},
			select: defaultPriceConfigSelect,
		});

		this.logger.log(
			`PriceConfig created for ${priceConfig.vehicleType}: baseFare=${Number(priceConfig.baseFare)}`,
			'PriceConfigService',
		);

		return priceConfig;
	}

	async list(dto: ListPriceConfigsDto) {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 20;
		const skip = (page - 1) * limit;

		const where: Record<string, unknown> = {};

		if (dto.vehicleType) {
			where.vehicleType = dto.vehicleType;
		}

		if (dto.isActive !== undefined) {
			where.isActive = dto.isActive;
		}

		const orderBy: Record<string, string> = {};
		orderBy[dto.sortBy ?? 'createdAt'] = dto.sortOrder ?? 'desc';

		const [priceConfigs, total] = await Promise.all([
			this.prisma.client.priceConfig.findMany({
				where,
				skip,
				take: limit,
				orderBy,
				select: defaultPriceConfigSelect,
			}),
			this.prisma.client.priceConfig.count({ where }),
		]);

		return {
			priceConfigs,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findById(id: string) {
		const priceConfig = await this.prisma.client.priceConfig.findUnique({
			where: { id },
			select: defaultPriceConfigSelect,
		});

		if (!priceConfig) {
			throw new NotFoundException('Configuração de preço não encontrada');
		}

		return priceConfig;
	}

	async update(id: string, dto: UpdatePriceConfigDto) {
		const priceConfig = await this.prisma.client.priceConfig.findUnique({
			where: { id },
		});

		if (!priceConfig) {
			throw new NotFoundException('Configuração de preço não encontrada');
		}

		const data: Record<string, unknown> = {};

		if (dto.vehicleType !== undefined) data.vehicleType = dto.vehicleType;
		if (dto.baseFare !== undefined) data.baseFare = dto.baseFare;
		if (dto.pricePerKm !== undefined) data.pricePerKm = dto.pricePerKm;
		if (dto.pricePerMin !== undefined) data.pricePerMin = dto.pricePerMin;
		if (dto.minFare !== undefined) data.minFare = dto.minFare;
		if (dto.ivaRate !== undefined) data.ivaRate = dto.ivaRate;
		if (dto.serviceFeeRate !== undefined)
			data.serviceFeeRate = dto.serviceFeeRate;
		if (dto.isActive !== undefined) data.isActive = dto.isActive;

		if (Object.keys(data).length === 0) {
			throw new BadRequestException('Nenhum dado para atualizar');
		}

		const updated = await this.prisma.client.priceConfig.update({
			where: { id },
			data,
			select: defaultPriceConfigSelect,
		});

		this.logger.log(
			`PriceConfig ${id} updated for ${updated.vehicleType}`,
			'PriceConfigService',
		);

		return updated;
	}

	async remove(id: string) {
		const priceConfig = await this.prisma.client.priceConfig.findUnique({
			where: { id },
		});

		if (!priceConfig) {
			throw new NotFoundException('Configuração de preço não encontrada');
		}

		await this.prisma.client.priceConfig.update({
			where: { id },
			data: { isActive: false },
		});

		this.logger.log(`PriceConfig ${id} deactivated`, 'PriceConfigService');

		return {
			msg: 'Configuração de preço removida com sucesso',
		};
	}

	async toggleActive(id: string) {
		const priceConfig = await this.prisma.client.priceConfig.findUnique({
			where: { id },
		});

		if (!priceConfig) {
			throw new NotFoundException('Configuração de preço não encontrada');
		}

		const updated = await this.prisma.client.priceConfig.update({
			where: { id },
			data: { isActive: !priceConfig.isActive },
			select: defaultPriceConfigSelect,
		});

		this.logger.log(
			`PriceConfig ${id} is now ${updated.isActive ? 'active' : 'inactive'}`,
			'PriceConfigService',
		);

		return updated;
	}
}
