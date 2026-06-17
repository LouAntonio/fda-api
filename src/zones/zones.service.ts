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

	/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

	private async findByIdInternal(id: string) {
		return (this.prisma.client.zone as any).findUnique({
			where: { id },
			select: defaultZoneSelect,
		}) as Promise<{
			id: string;
			name: string;
			surgeMultiplier: number;
			isActive: boolean;
			createdAt: Date;
		} | null>;
	}

	async create(dto: CreateZoneDto) {
		const id = uuidv7();
		const wkt = polygonToWkt(dto.boundary);

		await this.prisma.$queryRawUnsafe(
			`INSERT INTO "Zone" (id, name, boundary, "surgeMultiplier", "isActive", "createdAt")
			 VALUES ($1, $2, ST_GeomFromText($3, 4326), $4, $5, NOW())`,
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

		const where: Record<string, unknown> = {};

		if (dto.search) {
			where.name = { contains: dto.search, mode: 'insensitive' };
		}

		if (dto.isActive !== undefined) {
			where.isActive = dto.isActive;
		}

		const orderBy: Record<string, string> = {};
		orderBy[dto.sortBy ?? 'createdAt'] = dto.sortOrder ?? 'desc';

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

		const [raw] = (await this.prisma.$queryRawUnsafe(
			`SELECT COALESCE(
				(
					SELECT json_agg(
						json_build_array(
							ROUND(ST_X((dp).geom)::numeric, 6),
							ROUND(ST_Y((dp).geom)::numeric, 6)
						)
					)
					FROM (
						SELECT (ST_DumpPoints(z.boundary::geometry)::geometry_dump).geom AS geom
						FROM "Zone" z2 WHERE z2.id = $1
					) AS dp
				),
				'[]'::json
			) AS boundary
			FROM "Zone" z WHERE z.id = $1`,
			id,
		)) as any[];

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
			setClauses.push(`boundary = ST_GeomFromText($${idx++}, 4326)`);
			params.push(polygonToWkt(dto.boundary));
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
		await this.prisma.$queryRawUnsafe(sql, ...params);

		const updated = await this.findByIdInternal(id);

		this.logger.log(`Zone ${id} updated: ${updated!.name}`, 'ZonesService');

		return updated!;
	}

	async remove(id: string) {
		const zone = await this.findByIdInternal(id);

		if (!zone) {
			throw new NotFoundException('Zona não encontrada');
		}

		await this.prisma.$queryRawUnsafe(
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

		await this.prisma.$queryRawUnsafe(
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

	/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
}
