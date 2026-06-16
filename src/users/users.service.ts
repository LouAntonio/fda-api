import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { PrismaService } from '../prisma/prisma.service';
import { ResendService } from '../email/resend.service';
import { LoggerService } from '../logger/logger.service';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { BanUserDto } from './dto/ban-user.dto';

@Injectable()
export class UsersService {
	constructor(
		private prisma: PrismaService,
		private resend: ResendService,
		private logger: LoggerService,
	) {}

	async list(dto: ListUsersDto) {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 20;
		const skip = (page - 1) * limit;

		const where: Record<string, unknown> = { deletedAt: null };

		if (dto.search) {
			where.OR = [
				{ name: { contains: dto.search, mode: 'insensitive' } },
				{ email: { contains: dto.search, mode: 'insensitive' } },
			];
		}

		if (dto.status) {
			where.status = dto.status;
		}

		if (dto.role) {
			where.role = dto.role;
		}

		const [users, total] = await Promise.all([
			this.prisma.client.user.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
					status: true,
					bannedUntil: true,
					banMotive: true,
					emailVerified: true,
					createdAt: true,
				},
			}),
			this.prisma.client.user.count({ where }),
		]);

		return {
			users,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async updateRole(adminId: string, userId: string, dto: UpdateRoleDto) {
		if (adminId === userId) {
			throw new BadRequestException(
				'Não podes alterar a tua própria role',
			);
		}

		const user = await this.prisma.client.user.findUnique({
			where: { id: userId },
		});

		if (!user || user.deletedAt) {
			throw new NotFoundException('Utilizador não encontrado');
		}

		const previousRole = user.role;

		await this.prisma.client.user.update({
			where: { id: userId },
			data: { role: dto.role },
		});

		await this.prisma.client.auditLog.create({
			data: {
				id: uuidv7(),
				adminId,
				action: 'UPDATE_USER_ROLE',
				entity: 'User',
				entityId: userId,
				oldValue: { role: previousRole },
				newValue: { role: dto.role },
			},
		});

		this.logger.log(
			`User ${adminId} changed role of ${userId} from ${previousRole} to ${dto.role}`,
			'UsersService',
		);

		await this.resend
			.sendRoleChangedEmail(
				user.email ?? '',
				user.name ?? undefined,
				dto.role,
			)
			.catch((err: unknown) =>
				this.logger.error(
					'Failed to send role change email',
					err as string | undefined,
					'UsersService',
				),
			);

		return {
			msg: `Role alterada para ${dto.role}`,
		};
	}

	async ban(adminId: string, userId: string, dto: BanUserDto) {
		if (adminId === userId) {
			throw new BadRequestException('Não podes banir a ti mesmo');
		}

		const user = await this.prisma.client.user.findUnique({
			where: { id: userId },
		});

		if (!user || user.deletedAt) {
			throw new NotFoundException('Utilizador não encontrado');
		}

		if (user.status === 'BANNED') {
			throw new BadRequestException('Este utilizador já está banido');
		}

		const bannedUntil = dto.bannedUntil ? new Date(dto.bannedUntil) : null;

		await this.prisma.client.user.update({
			where: { id: userId },
			data: {
				status: 'BANNED',
				banMotive: dto.motive,
				bannedUntil,
			},
		});

		await this.prisma.client.auditLog.create({
			data: {
				id: uuidv7(),
				adminId,
				action: 'BAN_USER',
				entity: 'User',
				entityId: userId,
				oldValue: { status: user.status },
				newValue: {
					status: 'BANNED',
					motive: dto.motive,
					bannedUntil: dto.bannedUntil ?? null,
				},
			},
		});

		this.logger.log(
			`User ${adminId} banned user ${userId}. Motive: ${dto.motive}`,
			'UsersService',
		);

		await this.resend
			.sendAccountBannedEmail(
				user.email ?? '',
				user.name ?? undefined,
				dto.motive,
				bannedUntil ?? undefined,
			)
			.catch((err: unknown) =>
				this.logger.error(
					'Failed to send ban email',
					err as string | undefined,
					'UsersService',
				),
			);

		return {
			msg: 'Utilizador banido com sucesso',
		};
	}

	async unban(adminId: string, userId: string) {
		if (adminId === userId) {
			throw new BadRequestException('Não podes desbanir a ti mesmo');
		}

		const user = await this.prisma.client.user.findUnique({
			where: { id: userId },
		});

		if (!user || user.deletedAt) {
			throw new NotFoundException('Utilizador não encontrado');
		}

		if (user.status !== 'BANNED') {
			throw new BadRequestException('Este utilizador não está banido');
		}

		await this.prisma.client.user.update({
			where: { id: userId },
			data: {
				status: 'ACTIVE',
				banMotive: null,
				bannedUntil: null,
			},
		});

		await this.prisma.client.auditLog.create({
			data: {
				id: uuidv7(),
				adminId,
				action: 'UNBAN_USER',
				entity: 'User',
				entityId: userId,
				oldValue: { status: 'BANNED' },
				newValue: { status: 'ACTIVE' },
			},
		});

		this.logger.log(
			`User ${adminId} unbanned user ${userId}`,
			'UsersService',
		);

		await this.resend
			.sendAccountUnbannedEmail(user.email ?? '', user.name ?? undefined)
			.catch((err: unknown) =>
				this.logger.error(
					'Failed to send unban email',
					err as string | undefined,
					'UsersService',
				),
			);

		return {
			msg: 'Utilizador desbanido com sucesso',
		};
	}
}
