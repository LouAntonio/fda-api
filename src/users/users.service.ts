import {
	Injectable,
	NotFoundException,
	BadRequestException,
	ConflictException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BcryptService } from '../auth/services/bcrypt.service';
import { ResendService } from '../email/resend.service';
import { LoggerService } from '../logger/logger.service';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EmergencyContactDto } from './dto/emergency-contact.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { ConfirmPhoneDto } from './dto/confirm-phone.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { CreatePushTokenDto } from './dto/create-push-token.dto';
import { UpdateNotificationPrefsDto } from './dto/update-notification-prefs.dto';
import { coordsToWkt } from '../common/helpers/coords.helper';

const defaultUserSelect = {
	id: true,
	name: true,
	surname: true,
	email: true,
	phoneNumber: true,
	emailVerified: true,
	phoneNumberVerified: true,
	image: true,
	role: true,
	status: true,
	bannedUntil: true,
	banMotive: true,
	emergencyContactName: true,
	emergencyContactPhone: true,
	deviceId: true,
	lastLoginIp: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
} as const;

@Injectable()
export class UsersService {
	constructor(
		private prisma: PrismaService,
		private bcrypt: BcryptService,
		private resend: ResendService,
		private logger: LoggerService,
	) {}

	async list(dto: ListUsersDto) {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 20;
		const skip = (page - 1) * limit;

		const where: Record<string, unknown> = {};

		if (!dto.includeDeleted) {
			where.deletedAt = null;
		}

		if (dto.search) {
			where.OR = [
				{ name: { contains: dto.search, mode: 'insensitive' } },
				{ email: { contains: dto.search, mode: 'insensitive' } },
				{ surname: { contains: dto.search, mode: 'insensitive' } },
			];
		}

		if (dto.status) {
			where.status = dto.status;
		}

		if (dto.role) {
			where.role = dto.role;
		}

		if (dto.phoneNumber) {
			where.phoneNumber = {
				contains: dto.phoneNumber,
				mode: 'insensitive',
			};
		}

		if (dto.surname) {
			where.surname = { contains: dto.surname, mode: 'insensitive' };
		}

		if (dto.emailVerified !== undefined) {
			where.emailVerified = dto.emailVerified;
		}

		if (dto.phoneNumberVerified !== undefined) {
			where.phoneNumberVerified = dto.phoneNumberVerified;
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

		const [users, total] = await Promise.all([
			this.prisma.client.user.findMany({
				where,
				skip,
				take: limit,
				orderBy,
				select: defaultUserSelect,
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

	async findById(id: string, query?: UserQueryDto) {
		const include: Record<string, true | Record<string, unknown>> = {};

		if (query?.includeAddresses) {
			include.addresses = true;
		}
		if (query?.includeSessions) {
			include.sessions = { where: { expiresAt: { gte: new Date() } } };
		}
		if (query?.includeAccounts) {
			include.accounts = { select: { providerId: true } };
		}
		if (query?.includePushTokens) {
			include.pushTokens = true;
		}

		const user = await this.prisma.client.user.findUnique({
			where: { id },
			select: {
				...defaultUserSelect,
				...(Object.keys(include).length > 0 ? include : {}),
			},
		});

		if (!user) {
			throw new NotFoundException('Utilizador não encontrado');
		}

		return user;
	}

	async create(adminId: string, dto: CreateUserDto) {
		const existing = await this.prisma.client.user.findUnique({
			where: { phoneNumber: dto.phoneNumber },
		});

		if (existing) {
			throw new ConflictException('Este telefone já está registado');
		}

		if (dto.email) {
			const emailExists = await this.prisma.client.user.findUnique({
				where: { email: dto.email },
			});
			if (emailExists) {
				throw new ConflictException('Este email já está em uso');
			}
		}

		const hashedPassword = await this.bcrypt.hash(dto.password);

		const user = await this.prisma.client.user.create({
			data: {
				id: uuidv7(),
				name: dto.name,
				surname: dto.surname,
				email: dto.email,
				phoneNumber: dto.phoneNumber,
				role: dto.role ?? undefined,
			},
		});

		await this.prisma.client.account.create({
			data: {
				id: uuidv7(),
				userId: user.id,
				providerId: 'credential',
				accountId: user.id,
				password: hashedPassword,
			},
		});

		await this.prisma.client.auditLog.create({
			data: {
				id: uuidv7(),
				adminId,
				action: 'CREATE_USER',
				entity: 'User',
				entityId: user.id,
				newValue: { name: dto.name, role: dto.role ?? 'CLIENT' },
			},
		});

		this.logger.log(
			`Admin ${adminId} created user ${user.id}`,
			'UsersService',
		);

		return {
			msg: 'Utilizador criado com sucesso',
			data: { id: user.id },
		};
	}

	async update(adminId: string, userId: string, dto: UpdateUserDto) {
		const user = await this.prisma.client.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundException('Utilizador não encontrado');
		}

		const data: Record<string, unknown> = {};

		if (dto.name !== undefined) data.name = dto.name;
		if (dto.surname !== undefined) data.surname = dto.surname;
		if (dto.email !== undefined) data.email = dto.email;
		if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber;
		if (dto.image !== undefined) data.image = dto.image;
		if (dto.emergencyContactName !== undefined)
			data.emergencyContactName = dto.emergencyContactName;
		if (dto.emergencyContactPhone !== undefined)
			data.emergencyContactPhone = dto.emergencyContactPhone;
		if (dto.deviceId !== undefined) data.deviceId = dto.deviceId;

		if (Object.keys(data).length === 0) {
			throw new BadRequestException('Nenhum dado para atualizar');
		}

		await this.prisma.client.user.update({
			where: { id: userId },
			data,
		});

		await this.prisma.client.auditLog.create({
			data: {
				id: uuidv7(),
				adminId,
				action: 'UPDATE_USER',
				entity: 'User',
				entityId: userId,
				oldValue: {
					name: user.name,
					surname: user.surname,
					email: user.email,
				},
				newValue: data as unknown as Prisma.InputJsonValue,
			},
		});

		this.logger.log(
			`Admin ${adminId} updated user ${userId}`,
			'UsersService',
		);

		return {
			msg: 'Utilizador atualizado com sucesso',
		};
	}

	async remove(adminId: string, userId: string) {
		if (adminId === userId) {
			throw new BadRequestException(
				'Não podes deletar a tua própria conta',
			);
		}

		const user = await this.prisma.client.user.findUnique({
			where: { id: userId },
		});

		if (!user || user.deletedAt) {
			throw new NotFoundException('Utilizador não encontrado');
		}

		await this.prisma.client.user.update({
			where: { id: userId },
			data: { deletedAt: new Date() },
		});

		await this.prisma.client.auditLog.create({
			data: {
				id: uuidv7(),
				adminId,
				action: 'DELETE_USER',
				entity: 'User',
				entityId: userId,
				oldValue: { deletedAt: null },
				newValue: { deletedAt: new Date().toISOString() },
			},
		});

		this.logger.log(
			`Admin ${adminId} soft-deleted user ${userId}`,
			'UsersService',
		);

		return {
			msg: 'Utilizador removido com sucesso',
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

	async updateEmergencyContact(userId: string, dto: EmergencyContactDto) {
		const user = await this.prisma.client.user.findUnique({
			where: { id: userId },
		});

		if (!user || user.deletedAt) {
			throw new NotFoundException('Utilizador não encontrado');
		}

		await this.prisma.client.user.update({
			where: { id: userId },
			data: {
				emergencyContactName: dto.emergencyContactName,
				emergencyContactPhone: dto.emergencyContactPhone,
			},
		});

		return {
			msg: 'Contacto de emergência atualizado com sucesso',
		};
	}

	async registerDevice(userId: string, dto: RegisterDeviceDto) {
		const user = await this.prisma.client.user.findUnique({
			where: { id: userId },
		});

		if (!user || user.deletedAt) {
			throw new NotFoundException('Utilizador não encontrado');
		}

		await this.prisma.client.user.update({
			where: { id: userId },
			data: { deviceId: dto.deviceId },
		});

		return {
			msg: 'Dispositivo registado com sucesso',
		};
	}

	async sendPhoneVerification(userId: string, dto: VerifyPhoneDto) {
		const user = await this.prisma.client.user.findUnique({
			where: { id: userId },
		});

		if (!user || user.deletedAt) {
			throw new NotFoundException('Utilizador não encontrado');
		}

		if (user.phoneNumberVerified) {
			throw new BadRequestException('Telefone já está verificado');
		}

		if (user.phoneNumber !== dto.phoneNumber) {
			throw new BadRequestException(
				'O número fornecido não corresponde ao teu telefone',
			);
		}

		const code = Math.floor(100000 + Math.random() * 900000).toString();
		const hashedCode = crypto
			.createHash('sha256')
			.update(code)
			.digest('hex');

		await this.prisma.client.verification.upsert({
			where: {
				identifier_value: {
					identifier: 'phone_verification',
					value: hashedCode,
				},
			},
			update: {
				expiresAt: new Date(Date.now() + 10 * 60 * 1000),
			},
			create: {
				id: uuidv7(),
				identifier: 'phone_verification',
				value: hashedCode,
				userId: user.id,
				expiresAt: new Date(Date.now() + 10 * 60 * 1000),
			},
		});

		this.logger.log(
			`Phone verification code for user ${userId}: ${code}`,
			'UsersService',
		);

		return {
			msg: 'Código de verificação enviado (apenas estrutura preparada)',
		};
	}

	async confirmPhoneVerification(userId: string, dto: ConfirmPhoneDto) {
		const user = await this.prisma.client.user.findUnique({
			where: { id: userId },
		});

		if (!user || user.deletedAt) {
			throw new NotFoundException('Utilizador não encontrado');
		}

		if (user.phoneNumberVerified) {
			throw new BadRequestException('Telefone já está verificado');
		}

		const hashedCode = crypto
			.createHash('sha256')
			.update(dto.code)
			.digest('hex');

		const verification = await this.prisma.client.verification.findUnique({
			where: {
				identifier_value: {
					identifier: 'phone_verification',
					value: hashedCode,
				},
			},
		});

		if (!verification || verification.expiresAt < new Date()) {
			throw new BadRequestException('Código inválido ou expirado');
		}

		await this.prisma.client.user.update({
			where: { id: userId },
			data: { phoneNumberVerified: true },
		});

		await this.prisma.client.verification.delete({
			where: { id: verification.id },
		});

		return {
			msg: 'Telefone verificado com sucesso',
		};
	}

	async listAddresses(userId: string) {
		const user = await this.prisma.client.user.findUnique({
			where: { id: userId },
			select: { id: true },
		});

		if (!user) {
			throw new NotFoundException('Utilizador não encontrado');
		}

		const addresses = await this.prisma.client.userAddress.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' },
		});

		return addresses;
	}

	async createAddress(userId: string, dto: CreateAddressDto) {
		const user = await this.prisma.client.user.findUnique({
			where: { id: userId },
			select: { id: true },
		});

		if (!user) {
			throw new NotFoundException('Utilizador não encontrado');
		}

		const address = await this.prisma.client.userAddress.create({
			data: {
				id: uuidv7(),
				userId,
				label: dto.label,
				customLabel: dto.customLabel,
				address: dto.address,
				reference: dto.reference,
				location: coordsToWkt(dto.lat, dto.lng),
			},
		});

		return {
			msg: 'Endereço criado com sucesso',
			data: address,
		};
	}

	async updateAddress(
		userId: string,
		addressId: string,
		dto: UpdateAddressDto,
	) {
		const address = await this.prisma.client.userAddress.findUnique({
			where: { id: addressId },
		});

		if (!address || address.userId !== userId) {
			throw new NotFoundException('Endereço não encontrado');
		}

		const data: Record<string, unknown> = {};

		if (dto.label !== undefined) data.label = dto.label;
		if (dto.customLabel !== undefined) data.customLabel = dto.customLabel;
		if (dto.address !== undefined) data.address = dto.address;
		if (dto.reference !== undefined) data.reference = dto.reference;
		if (dto.lat !== undefined && dto.lng !== undefined) {
			data.location = coordsToWkt(dto.lat, dto.lng);
		}

		if (Object.keys(data).length === 0) {
			throw new BadRequestException('Nenhum dado para atualizar');
		}

		const updated = await this.prisma.client.userAddress.update({
			where: { id: addressId },
			data,
		});

		return {
			msg: 'Endereço atualizado com sucesso',
			data: updated,
		};
	}

	async deleteAddress(userId: string, addressId: string) {
		const address = await this.prisma.client.userAddress.findUnique({
			where: { id: addressId },
		});

		if (!address || address.userId !== userId) {
			throw new NotFoundException('Endereço não encontrado');
		}

		await this.prisma.client.userAddress.delete({
			where: { id: addressId },
		});

		return {
			msg: 'Endereço removido com sucesso',
		};
	}

	async listSessions(userId: string) {
		const user = await this.prisma.client.user.findUnique({
			where: { id: userId },
			select: { id: true },
		});

		if (!user) {
			throw new NotFoundException('Utilizador não encontrado');
		}

		const sessions = await this.prisma.client.session.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' },
		});

		return sessions;
	}

	async revokeSession(userId: string, sessionId: string) {
		const session = await this.prisma.client.session.findUnique({
			where: { id: sessionId },
		});

		if (!session || session.userId !== userId) {
			throw new NotFoundException('Sessão não encontrada');
		}

		await this.prisma.client.session.delete({
			where: { id: sessionId },
		});

		return {
			msg: 'Sessão revogada com sucesso',
		};
	}

	async listPushTokens(userId: string) {
		const user = await this.prisma.client.user.findUnique({
			where: { id: userId },
			select: { id: true },
		});

		if (!user) {
			throw new NotFoundException('Utilizador não encontrado');
		}

		const tokens = await this.prisma.client.pushToken.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' },
		});

		return tokens;
	}

	async getStats(userId: string) {
		const user = await this.prisma.client.user.findUnique({
			where: { id: userId },
			select: { id: true },
		});

		if (!user) {
			throw new NotFoundException('Utilizador não encontrado');
		}

		const trips = await this.prisma.client.trip.findMany({
			where: {
				clientId: userId,
				status: 'COMPLETED',
				deletedAt: null,
			},
			select: {
				actualDistanceKm: true,
				actualDurationMin: true,
				totalPrice: true,
			},
		});

		const totalTrips = trips.length;
		const totalDistanceKm = trips.reduce(
			(sum, t) => sum + (t.actualDistanceKm ?? 0),
			0,
		);
		const totalDurationMin = trips.reduce(
			(sum, t) => sum + (t.actualDurationMin ?? 0),
			0,
		);
		const totalSpent = trips.reduce(
			(sum, t) => sum + Number(t.totalPrice),
			0,
		);

		return {
			stats: {
				totalTrips,
				totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
				totalDurationMin,
				totalSpent: Math.round(totalSpent * 100) / 100,
			},
		};
	}

	async createPushToken(userId: string, dto: CreatePushTokenDto) {
		const user = await this.prisma.client.user.findUnique({
			where: { id: userId },
			select: { id: true },
		});

		if (!user) {
			throw new NotFoundException('Utilizador não encontrado');
		}

		const existing = await this.prisma.client.pushToken.findUnique({
			where: { token: dto.token },
		});

		if (existing) {
			if (existing.userId !== userId) {
				await this.prisma.client.pushToken.update({
					where: { id: existing.id },
					data: { userId },
				});
			}
			return {
				msg: 'Token já registado',
				data: existing,
			};
		}

		const token = await this.prisma.client.pushToken.create({
			data: {
				id: uuidv7(),
				userId,
				token: dto.token,
				deviceType: dto.deviceType ?? null,
			},
		});

		return {
			msg: 'Token registado com sucesso',
			data: token,
		};
	}

	async removePushToken(userId: string, tokenId: string) {
		const token = await this.prisma.client.pushToken.findUnique({
			where: { id: tokenId },
		});

		if (!token || token.userId !== userId) {
			throw new NotFoundException('Token não encontrado');
		}

		await this.prisma.client.pushToken.delete({
			where: { id: tokenId },
		});

		return {
			msg: 'Token removido com sucesso',
		};
	}

	async getNotificationPreferences(userId: string) {
		let prefs = await this.prisma.client.notificationPreference.findUnique({
			where: { userId },
		});

		if (!prefs) {
			prefs = await this.prisma.client.notificationPreference.create({
				data: {
					id: uuidv7(),
					userId,
				},
			});
		}

		return prefs;
	}

	async updateNotificationPreferences(
		userId: string,
		dto: UpdateNotificationPrefsDto,
	) {
		const data: Record<string, boolean> = {};
		if (dto.pushEnabled !== undefined) data.pushEnabled = dto.pushEnabled;
		if (dto.emailEnabled !== undefined) data.emailEnabled = dto.emailEnabled;
		if (dto.soundsEnabled !== undefined)
			data.soundsEnabled = dto.soundsEnabled;

		if (Object.keys(data).length === 0) {
			throw new BadRequestException('Nenhum dado para atualizar');
		}

		const prefs = await this.prisma.client.notificationPreference.upsert({
			where: { userId },
			create: {
				id: uuidv7(),
				userId,
				...data,
			},
			update: data,
		});

		return prefs;
	}
}
