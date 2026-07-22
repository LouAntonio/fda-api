import {
	Injectable,
	ConflictException,
	UnauthorizedException,
	BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { uuidv7 } from 'uuidv7';
import { PrismaService } from '../prisma/prisma.service';
import { BcryptService } from './services/bcrypt.service';
import { GoogleAuthService } from './services/google-auth.service';
import { TokenService } from './services/token.service';
import { ResendService } from '../email/resend.service';
import { LoggerService } from '../logger/logger.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';

@Injectable()
export class AuthService {
	constructor(
		private prisma: PrismaService,
		private bcrypt: BcryptService,
		private googleAuth: GoogleAuthService,
		private tokenService: TokenService,
		private resend: ResendService,
		private logger: LoggerService,
	) {}

	async register(dto: RegisterDto) {
		const existing = await this.prisma.client.user.findUnique({
			where: { phoneNumber: dto.phoneNumber },
		});

		if (existing) {
			throw new ConflictException('Este telefone já está registado');
		}

		const hashedPassword = await this.bcrypt.hash(dto.password);

		const user = await this.prisma.client.user.create({
			data: {
				id: uuidv7(),
				name: dto.name,
				surname: dto.surname,
				phoneNumber: dto.phoneNumber,
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

		return {
			msg: 'Cadastro realizado com sucesso',
		};
	}

	async login(dto: LoginDto) {
		const user = await this.prisma.client.user.findUnique({
			where: { phoneNumber: dto.phoneNumber },
		});

		if (!user || user.deletedAt) {
			throw new UnauthorizedException('Credenciais inválidas');
		}

		if (user.status === 'BANNED') {
			throw new UnauthorizedException('A tua conta está banida');
		}

		const credentialAccount = await this.prisma.client.account.findFirst({
			where: { userId: user.id, providerId: 'credential' },
		});

		if (!credentialAccount || !credentialAccount.password) {
			throw new UnauthorizedException('Credenciais inválidas');
		}

		const valid = await this.bcrypt.compare(
			dto.password,
			credentialAccount.password,
		);
		if (!valid) {
			throw new UnauthorizedException('Credenciais inválidas');
		}

		const tokens = await this.tokenService.generateAuthTokens({
			id: user.id,
			email: user.email ?? '',
		});
		const accounts = await this.prisma.client.account.findMany({
			where: { userId: user.id },
			select: { providerId: true },
		});

		return {
			msg: 'Login realizado com sucesso',
			data: {
				accessToken: tokens.accessToken,
				refreshToken: tokens.refreshToken,
				user: {
					id: user.id,
					email: user.email,
					name: user.name,
					emailVerified: user.emailVerified,
					role: user.role,
					phoneNumber: user.phoneNumber,
					createdAt: user.createdAt,
					image: user.image,
					hasPassword: !!credentialAccount.password,
					accounts,
				},
			},
		};
	}

	async googleLogin(accessToken: string) {
		const payload = await this.googleAuth.verifyToken(accessToken);
		if (!payload.email) {
			throw new UnauthorizedException('Autenticação falhou');
		}

		const existingAccount = await this.prisma.client.account.findFirst({
			where: {
				providerId: 'google',
				accountId: payload.sub,
			},
			include: { user: true },
		});

		if (existingAccount) {
			const tokens = await this.tokenService.generateAuthTokens({
				id: existingAccount.user.id,
				email: existingAccount.user.email ?? '',
			});
			const accounts = await this.prisma.client.account.findMany({
				where: { userId: existingAccount.user.id },
				select: { providerId: true },
			});

			return {
				msg: 'Login realizado com sucesso',
				data: {
					accessToken: tokens.accessToken,
					refreshToken: tokens.refreshToken,
					user: {
						id: existingAccount.user.id,
						email: existingAccount.user.email,
						name: existingAccount.user.name,
						emailVerified: existingAccount.user.emailVerified,
						role: existingAccount.user.role,
						phoneNumber: existingAccount.user.phoneNumber,
						createdAt: existingAccount.user.createdAt,
						image: existingAccount.user.image,
						hasPassword: false,
						accounts,
					},
				},
			};
		}

		const existingUser = await this.prisma.client.user.findUnique({
			where: { email: payload.email },
		});

		if (existingUser) {
			throw new UnauthorizedException(
				'Esta conta de email já possui um cadastro. Faça login com email e senha e vincule sua conta Google nas configurações.',
			);
		}

		const user = await this.prisma.client.user.create({
			data: {
				id: uuidv7(),
				email: payload.email,
				name: payload.name ?? 'Utilizador',
				emailVerified: true,
				image: payload.picture,
			},
		});

		await this.prisma.client.account.create({
			data: {
				id: uuidv7(),
				userId: user.id,
				providerId: 'google',
				accountId: payload.sub,
			},
		});

		await this.resend
			.sendWelcomeEmail(user.email ?? '', user.name ?? undefined)
			.catch((err: unknown) =>
				this.logger.error(
					'Failed to send welcome email',
					err as string | undefined,
					'AuthService',
				),
			);

		const tokens = await this.tokenService.generateAuthTokens({
			id: user.id,
			email: user.email ?? '',
		});

		return {
			msg: 'Login realizado com sucesso',
			data: {
				accessToken: tokens.accessToken,
				refreshToken: tokens.refreshToken,
				user: {
					id: user.id,
					email: user.email,
					name: user.name,
					emailVerified: user.emailVerified,
					role: user.role,
					phoneNumber: user.phoneNumber,
					createdAt: user.createdAt,
					image: user.image,
					hasPassword: false,
					accounts: [{ providerId: 'google' }],
				},
			},
		};
	}

	async changePassword(userId: string, dto: ChangePasswordDto) {
		const credentialAccount = await this.prisma.client.account.findFirst({
			where: { userId, providerId: 'credential' },
		});

		if (!credentialAccount?.password) {
			throw new UnauthorizedException(
				'Não tens uma palavra-passe definida. Usa a opção "Definir Palavra-passe".',
			);
		}

		const valid = await this.bcrypt.compare(
			dto.currentPassword,
			credentialAccount.password,
		);
		if (!valid) {
			throw new UnauthorizedException('Palavra-passe atual incorreta');
		}

		if (dto.currentPassword === dto.newPassword) {
			throw new BadRequestException(
				'A nova palavra-passe deve ser diferente da atual',
			);
		}

		const hashedPassword = await this.bcrypt.hash(dto.newPassword);

		await this.prisma.client.account.update({
			where: { id: credentialAccount.id },
			data: { password: hashedPassword },
		});

		await this.prisma.client.session.deleteMany({
			where: { userId },
		});

		return {
			msg: 'Palavra-passe atualizada com sucesso',
		};
	}

	async changeEmail(userId: string, dto: ChangeEmailDto) {
		const credentialAccount = await this.prisma.client.account.findFirst({
			where: { userId, providerId: 'credential' },
		});

		if (credentialAccount?.password) {
			const valid = await this.bcrypt.compare(
				dto.password,
				credentialAccount.password,
			);
			if (!valid) {
				throw new UnauthorizedException('Palavra-passe incorreta');
			}
		}

		const user = await this.prisma.client.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new UnauthorizedException('Usuário não encontrado');
		}

		if (dto.newEmail.toLowerCase() === user.email?.toLowerCase()) {
			throw new BadRequestException('O novo email é igual ao atual');
		}

		const existing = await this.prisma.client.user.findUnique({
			where: { email: dto.newEmail },
		});

		if (existing) {
			throw new ConflictException('Este email já está em uso');
		}

		await this.prisma.client.user.update({
			where: { id: userId },
			data: {
				email: dto.newEmail,
				emailVerified: false,
			},
		});

		await this.sendVerificationEmail({
			id: userId,
			email: dto.newEmail,
			name: user.name,
		}).catch(() => {});

		return {
			msg: 'Email atualizado. Verifica a tua caixa de entrada para confirmar o novo email.',
		};
	}

	async updateProfile(userId: string, dto: UpdateProfileDto) {
		const data: Record<string, string | undefined> = {};

		if (dto.name !== undefined) data.name = dto.name;
		if (dto.surname !== undefined) data.surname = dto.surname;
		if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber;

		if (dto.image !== undefined) {
			data.image = dto.image;
		}

		if (Object.keys(data).length === 0) {
			throw new BadRequestException('Nenhum dado para atualizar');
		}

		await this.prisma.client.user.update({
			where: { id: userId },
			data,
		});

		return {
			msg: 'Perfil atualizado com sucesso',
		};
	}

	async forgotPassword(dto: ForgotPasswordDto) {
		const where = dto.email
			? { email: dto.email }
			: { phoneNumber: dto.phoneNumber };
		const user = await this.prisma.client.user.findUnique({ where });

		if (user) {
			const rawToken = uuidv7();

			await this.prisma.client.verification.create({
				data: {
					id: uuidv7(),
					identifier: 'password_reset',
					value: this.hashToken(rawToken),
					userId: user.id,
					expiresAt: new Date(Date.now() + 60 * 60 * 1000),
				},
			});

			const resetLink = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/resetar-senha?token=${rawToken}`;

			if (user.email) {
				await this.resend
					.sendPasswordResetEmail(
						user.email,
						user.name ?? undefined,
						resetLink,
					)
					.catch((err: unknown) =>
						this.logger.error(
							'Failed to send password reset email',
							err as string | undefined,
							'AuthService',
						),
					);
			}
		}

		return {
			msg: 'Se o email existir, você receberá um link de recuperação',
		};
	}

	async verifyResetToken(token: string) {
		const verification = await this.prisma.client.verification.findUnique({
			where: {
				identifier_value: {
					identifier: 'password_reset',
					value: this.hashToken(token),
				},
				expiresAt: { gte: new Date() },
			},
		});

		if (!verification || !verification.userId) {
			throw new BadRequestException(
				'Token de recuperação inválido ou expirado',
			);
		}

		return {
			msg: 'Token válido',
			userId: verification.userId,
		};
	}

	async resetPassword(dto: ResetPasswordDto) {
		const verification = await this.prisma.client.verification.findUnique({
			where: {
				identifier_value: {
					identifier: 'password_reset',
					value: this.hashToken(dto.token),
				},
				expiresAt: { gte: new Date() },
			},
		});

		if (!verification || !verification.userId) {
			throw new BadRequestException(
				'Token de recuperação inválido ou expirado',
			);
		}

		const user = await this.prisma.client.user.findUnique({
			where: { id: verification.userId },
		});

		if (!user) {
			throw new BadRequestException(
				'Token de recuperação inválido ou expirado',
			);
		}

		const hashedPassword = await this.bcrypt.hash(dto.password);

		const existingAccount = await this.prisma.client.account.findFirst({
			where: { userId: user.id, providerId: 'credential' },
		});

		if (existingAccount) {
			await this.prisma.client.account.update({
				where: { id: existingAccount.id },
				data: { password: hashedPassword },
			});
		} else {
			await this.prisma.client.account.create({
				data: {
					id: uuidv7(),
					userId: user.id,
					providerId: 'credential',
					accountId: user.id,
					password: hashedPassword,
				},
			});
		}

		await this.prisma.client.session.deleteMany({
			where: { userId: user.id },
		});

		await this.prisma.client.verification.delete({
			where: { id: verification.id },
		});

		return {
			msg: 'Senha redefinida com sucesso',
		};
	}

	async refresh(refreshToken: string) {
		const result = await this.tokenService.refreshTokens(refreshToken);

		return {
			msg: 'Token renovado com sucesso',
			data: {
				accessToken: result.accessToken,
				refreshToken: result.refreshToken,
				user: result.user,
			},
		};
	}

	async logout(userId: string, refreshToken: string) {
		await this.tokenService.revokeSession(userId, refreshToken);

		return {
			msg: 'Sessão encerrada com sucesso',
		};
	}

	async deleteAccount(userId: string, dto: DeleteAccountDto) {
		const user = await this.prisma.client.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new BadRequestException('Utilizador não encontrado');
		}

		const credentialAccount = await this.prisma.client.account.findFirst({
			where: { userId, providerId: 'credential' },
			select: { password: true },
		});

		if (credentialAccount?.password) {
			if (!dto.password) {
				throw new BadRequestException(
					'Confirma a tua palavra-passe para eliminar a conta.',
				);
			}

			const valid = await this.bcrypt.compare(
				dto.password,
				credentialAccount.password,
			);
			if (!valid) {
				throw new UnauthorizedException('Palavra-passe incorreta');
			}
		}

		await this.prisma.client.session.deleteMany({
			where: { userId },
		});

		await this.prisma.client.user.update({
			where: { id: userId },
			data: { deletedAt: new Date() },
		});

		this.logger.log(`Account deleted: ${userId}`, 'AuthService');

		return {
			msg: 'Conta eliminada com sucesso.',
		};
	}

	async me(userId: string) {
		const user = await this.prisma.client.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				surname: true,
				email: true,
				emailVerified: true,
				image: true,
				role: true,
				phoneNumber: true,
				createdAt: true,
				accounts: {
					select: { providerId: true },
				},
			},
		});

		if (!user) {
			throw new UnauthorizedException('Usuário não encontrado');
		}

		const credentialAccount = await this.prisma.client.account.findFirst({
			where: { userId, providerId: 'credential' },
			select: { password: true },
		});

		return {
			msg: 'Dados do usuário',
			data: {
				...user,
				hasPassword: !!credentialAccount?.password,
			},
		};
	}

	private hashToken(token: string): string {
		return crypto.createHash('sha256').update(token).digest('hex');
	}

	private async sendVerificationEmail(user: {
		id: string;
		email: string | null;
		name?: string | null;
	}) {
		const rawToken = uuidv7();

		await this.prisma.client.verification.create({
			data: {
				id: uuidv7(),
				identifier: 'email_verification',
				value: this.hashToken(rawToken),
				userId: user.id,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			},
		});

		const link = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/verificar-email?token=${rawToken}`;

		await this.resend
			.sendVerificationEmail(
				user.email ?? '',
				user.name ?? undefined,
				link,
			)
			.catch((err: unknown) =>
				this.logger.error(
					'Failed to send verification email',
					err as string | undefined,
					'AuthService',
				),
			);
	}
}
