import { Injectable, NotFoundException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

const defaultAuditLogSelect = {
	id: true,
	adminId: true,
	action: true,
	entity: true,
	entityId: true,
	oldValue: true,
	newValue: true,
	createdAt: true,
} as const;

@Injectable()
export class AuditLogsService {
	constructor(
		private prisma: PrismaService,
		private logger: LoggerService,
	) {}

	async create(dto: CreateAuditLogDto) {
		const admin = await this.prisma.client.user.findUnique({
			where: { id: dto.adminId },
			select: { id: true },
		});

		if (!admin) {
			throw new NotFoundException('Administrador não encontrado');
		}

		const log = await this.prisma.client.auditLog.create({
			data: {
				id: uuidv7(),
				adminId: dto.adminId,
				action: dto.action,
				entity: dto.entity,
				entityId: dto.entityId,
				oldValue: dto.oldValue ?? undefined,
				newValue: dto.newValue ?? undefined,
			},
			select: defaultAuditLogSelect,
		});

		this.logger.log(
			`AuditLog ${log.id}: ${dto.action} on ${dto.entity}(${dto.entityId})`,
			'AuditLogsService',
		);

		return log;
	}

	async list(dto: ListAuditLogsDto) {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 50;
		const skip = (page - 1) * limit;

		const where: Record<string, unknown> = {};

		if (dto.entity) where.entity = dto.entity;
		if (dto.entityId) where.entityId = dto.entityId;
		if (dto.adminId) where.adminId = dto.adminId;
		if (dto.action) where.action = dto.action;

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

		const [logs, total] = await Promise.all([
			this.prisma.client.auditLog.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: dto.sortOrder ?? 'desc' },
				select: {
					...defaultAuditLogSelect,
					admin: {
						select: {
							id: true,
							name: true,
							surname: true,
						},
					},
				},
			}),
			this.prisma.client.auditLog.count({ where }),
		]);

		return {
			logs,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findById(id: string) {
		const log = await this.prisma.client.auditLog.findUnique({
			where: { id },
			select: {
				...defaultAuditLogSelect,
				admin: {
					select: {
						id: true,
						name: true,
						surname: true,
						email: true,
					},
				},
			},
		});

		if (!log) {
			throw new NotFoundException('Entrada de auditoria não encontrada');
		}

		return log;
	}
}
