import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { ListZonesDto } from './dto/list-zones.dto';
import { polygonToWkt } from '../common/helpers/coords.helper';

const defaultZoneSelect = {
	id: true,
	name: true,
	surgeMultiplier: true,
	isActive: true,
	createdAt: true,
} as const;

@Injectable()
export class ZonesService {
	constructor(
		private prisma: PrismaService,
		private logger: LoggerService,
	) {}

	async create(dto: CreateZoneDto) {
		/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
		const zone = await (this.prisma.client.zone as any).create({
			data: {
				id: uuidv7(),
				name: dto.name,
				boundary: polygonToWkt(dto.boundary),
				surgeMultiplier: dto.surgeMultiplier ?? 1.0,
				isActive: dto.isActive ?? true,
			},
			select: {
				...defaultZoneSelect,
				boundary: true,
			},
		});

		this.logger.log(
			`Zone created: ${zone.name} (surge: ${zone.surgeMultiplier})`,
			'ZonesService',
		);

		return zone;
		/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
	}

	async list(dto: ListZonesDto) {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 20;
		const skip = (page - 1) * limit;

		const where: Record<string, unknown> = {};

		if (dto.search) {
			where.name = { contains: dto.search, mode: 'insensitive' };
		}

		if (dto.isActive !== undefined) {
			where.isActive = dto.isActive;
		}

		const orderBy: Record<string, string> = {};
		orderBy[dto.sortBy ?? 'createdAt'] = dto.sortOrder ?? 'desc';

		/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
		const [zones, total] = await Promise.all([
			(this.prisma.client.zone as any).findMany({
				where,
				skip,
				take: limit,
				orderBy,
				select: {
					...defaultZoneSelect,
				},
			}) as Promise<any[]>,
			(this.prisma.client.zone as any).count({
				where,
			}) as Promise<number>,
		]);
		/* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

		return {
			zones,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findById(id: string) {
		/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
		const zone = await (this.prisma.client.zone as any).findUnique({
			where: { id },
			select: {
				...defaultZoneSelect,
				boundary: true,
			},
		});

		if (!zone) {
			throw new NotFoundException('Zona não encontrada');
		}

		return zone;
		/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
	}

	async update(id: string, dto: UpdateZoneDto) {
		/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
		const existing = await (this.prisma.client.zone as any).findUnique({
			where: { id },
		});

		if (!existing) {
			throw new NotFoundException('Zona não encontrada');
		}

		const data: Record<string, unknown> = {};

		if (dto.name !== undefined) data.name = dto.name;
		if (dto.boundary !== undefined)
			data.boundary = polygonToWkt(dto.boundary);
		if (dto.surgeMultiplier !== undefined)
			data.surgeMultiplier = dto.surgeMultiplier;
		if (dto.isActive !== undefined) data.isActive = dto.isActive;

		if (Object.keys(data).length === 0) {
			throw new BadRequestException('Nenhum dado para atualizar');
		}

		const updated = await (this.prisma.client.zone as any).update({
			where: { id },
			data,
			select: {
				...defaultZoneSelect,
				boundary: true,
			},
		});

		this.logger.log(`Zone ${id} updated: ${updated.name}`, 'ZonesService');

		return updated;
		/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
	}

	async remove(id: string) {
		/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
		const zone = await (this.prisma.client.zone as any).findUnique({
			where: { id },
		});

		if (!zone) {
			throw new NotFoundException('Zona não encontrada');
		}

		await (this.prisma.client.zone as any).update({
			where: { id },
			data: { isActive: false },
		});

		this.logger.log(`Zone ${id} deactivated: ${zone.name}`, 'ZonesService');

		return {
			msg: 'Zona removida com sucesso',
		};
		/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
	}

	async toggleActive(id: string) {
		/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
		const zone = await (this.prisma.client.zone as any).findUnique({
			where: { id },
		});

		if (!zone) {
			throw new NotFoundException('Zona não encontrada');
		}

		const updated = await (this.prisma.client.zone as any).update({
			where: { id },
			data: { isActive: !zone.isActive },
			select: {
				...defaultZoneSelect,
				boundary: true,
			},
		});

		this.logger.log(
			`Zone ${id} is now ${updated.isActive ? 'active' : 'inactive'}`,
			'ZonesService',
		);

		return updated;
		/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
	}
}
