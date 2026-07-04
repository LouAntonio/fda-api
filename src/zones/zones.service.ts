import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { Prisma } from '@prisma/client';
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

	private async findByIdInternal(id: string) {
		return this.prisma.client.zone.findUnique({
			where: { id },
			select: defaultZoneSelect,
		});
	}

	private async validateBoundary(wkt: string) {
		try {
			await this.prisma.client.$queryRawUnsafe<{ valid: boolean }[]>(
				`SELECT ST_IsValid(ST_GeomFromText($1, 4326)) AS valid`,
				wkt,
			);
		} catch {
			throw new BadRequestException(
				'Polígono inválido. Verifique as coordenadas e tente novamente.',
			);
		}
	}

	async create(dto: CreateZoneDto) {
		const id = uuidv7();
		const wkt = polygonToWkt(dto.boundary);

		await this.validateBoundary(wkt);

		await this.prisma.client.$executeRawUnsafe(
			`INSERT INTO "Zone" (id, name, boundary, "surgeMultiplier", "isActive", "createdAt")
			 VALUES ($1, $2, $3, $4, $5, NOW())`,
			id,
			dto.name,
			wkt,
			dto.surgeMultiplier ?? 1.0,
			dto.isActive ?? true,
		);

		const zone = await this.findByIdInternal(id);

		this.logger.log(
			`Zone created: ${zone!.name} (surge: ${zone!.surgeMultiplier})`,
			'ZonesService',
		);

		return zone!;
	}

	async list(dto: ListZonesDto) {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 20;
		const skip = (page - 1) * limit;

		const where: Prisma.ZoneWhereInput = {};

		if (dto.search) {
			where.name = { contains: dto.search, mode: 'insensitive' };
		}

		if (dto.isActive !== undefined) {
			where.isActive = dto.isActive;
		}

		const orderBy: Record<string, 'asc' | 'desc'> = {};
		orderBy[dto.sortBy ?? 'createdAt'] = dto.sortOrder ?? 'desc';

		const [zones, total] = await Promise.all([
			this.prisma.client.zone.findMany({
				where,
				skip,
				take: limit,
				orderBy,
				select: {
					...defaultZoneSelect,
				},
			}),
			this.prisma.client.zone.count({
				where,
			}),
		]);

		return {
			zones,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findById(id: string) {
		const zone = await this.findByIdInternal(id);

		if (!zone) {
			throw new NotFoundException('Zona não encontrada');
		}

		const [raw] = await this.prisma.client.$queryRawUnsafe<
			{ boundary: [number, number][] }[]
		>(
			`SELECT COALESCE(
				(
					SELECT json_agg(
						json_build_array(
							ROUND(ST_X((dp).geom)::numeric, 6),
							ROUND(ST_Y((dp).geom)::numeric, 6)
						)
					)
					FROM (
						SELECT (ST_DumpPoints(ST_GeomFromText(z.boundary, 4326))::geometry_dump).geom AS geom
						FROM "Zone" z2 WHERE z2.id = $1
					) AS dp
				),
				'[]'::json
			) AS boundary
			FROM "Zone" z WHERE z.id = $1`,
			id,
		);

		return {
			...zone,
			boundary: raw?.boundary ?? [],
		};
	}

	async update(id: string, dto: UpdateZoneDto) {
		const existing = await this.findByIdInternal(id);

		if (!existing) {
			throw new NotFoundException('Zona não encontrada');
		}

		const setClauses: string[] = [];
		const params: unknown[] = [];
		let idx = 1;

		if (dto.name !== undefined) {
			setClauses.push(`name = $${idx++}`);
			params.push(dto.name);
		}
		if (dto.boundary !== undefined) {
			const wkt = polygonToWkt(dto.boundary);
			await this.validateBoundary(wkt);
			setClauses.push(`boundary = $${idx++}`);
			params.push(wkt);
		}
		if (dto.surgeMultiplier !== undefined) {
			setClauses.push(`"surgeMultiplier" = $${idx++}`);
			params.push(dto.surgeMultiplier);
		}
		if (dto.isActive !== undefined) {
			setClauses.push(`"isActive" = $${idx++}`);
			params.push(dto.isActive);
		}

		if (setClauses.length === 0) {
			throw new BadRequestException('Nenhum dado para atualizar');
		}

		params.push(id);
		const sql = `UPDATE "Zone" SET ${setClauses.join(', ')} WHERE id = $${idx}`;
		await this.prisma.client.$executeRawUnsafe(sql, ...params);

		const updated = await this.findByIdInternal(id);

		this.logger.log(`Zone ${id} updated: ${updated!.name}`, 'ZonesService');

		return updated!;
	}

	async remove(id: string) {
		const zone = await this.findByIdInternal(id);

		if (!zone) {
			throw new NotFoundException('Zona não encontrada');
		}

		await this.prisma.client.$executeRawUnsafe(
			`UPDATE "Zone" SET "isActive" = false WHERE id = $1`,
			id,
		);

		this.logger.log(`Zone ${id} deactivated: ${zone.name}`, 'ZonesService');

		return {
			msg: 'Zona removida com sucesso',
		};
	}

	async toggleActive(id: string) {
		const zone = await this.findByIdInternal(id);

		if (!zone) {
			throw new NotFoundException('Zona não encontrada');
		}

		await this.prisma.client.$executeRawUnsafe(
			`UPDATE "Zone" SET "isActive" = NOT "isActive" WHERE id = $1`,
			id,
		);

		const updated = await this.findByIdInternal(id);

		this.logger.log(
			`Zone ${id} is now ${updated!.isActive ? 'active' : 'inactive'}`,
			'ZonesService',
		);

		return updated!;
	}
}
