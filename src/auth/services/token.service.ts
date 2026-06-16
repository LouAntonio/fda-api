import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { uuidv7 } from 'uuidv7';
import { PrismaService } from '../../prisma/prisma.service';

export interface TokenPayload {
	sub: string;
	email?: string;
}

export interface RefreshTokenPayload extends TokenPayload {
	jti: string;
}

@Injectable()
export class TokenService {
	constructor(
		private readonly jwtService: JwtService,
		private readonly prisma: PrismaService,
	) {}

	async generateAuthTokens(user: { id: string; email?: string | null }) {
		const accessToken = this.generateAccessToken(user);
		const refreshToken = await this.generateRefreshToken(user);

		return { accessToken, refreshToken };
	}

	private generateAccessToken(user: {
		id: string;
		email?: string | null;
	}): string {
		const payload: TokenPayload = {
			sub: user.id,
			email: user.email ?? undefined,
		};
		return this.jwtService.sign(payload, {
			expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as never,
		});
	}

	private async generateRefreshToken(user: {
		id: string;
		email?: string | null;
	}): Promise<string> {
		const jti = uuidv7();
		const payload: RefreshTokenPayload = {
			sub: user.id,
			email: user.email ?? undefined,
			jti,
		};

		const token = this.jwtService.sign(payload, {
			secret: process.env.JWT_REFRESH_SECRET,
			expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as never,
		});

		await this.prisma.client.session.create({
			data: {
				id: uuidv7(),
				userId: user.id,
				token: jti,
				expiresAt: new Date(
					Date.now() +
						this.parseExpiresIn(
							process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
						),
				),
			},
		});

		return token;
	}

	async refreshTokens(refreshToken: string) {
		let payload: RefreshTokenPayload;
		try {
			payload = this.jwtService.verify<RefreshTokenPayload>(
				refreshToken,
				{ secret: process.env.JWT_REFRESH_SECRET },
			);
		} catch {
			throw new UnauthorizedException('Sessão expirada');
		}

		const user = await this.prisma.client.user.findUnique({
			where: { id: payload.sub },
		});

		if (!user || user.deletedAt) {
			throw new UnauthorizedException('Sessão expirada');
		}

		if (user.status === 'BANNED') {
			throw new UnauthorizedException('A tua conta está banida');
		}

		const session = await this.prisma.client.session.findUnique({
			where: { token: payload.jti },
		});

		if (!session) {
			throw new UnauthorizedException('Sessão expirada');
		}

		if (session.expiresAt < new Date()) {
			await this.prisma.client.session.delete({
				where: { id: session.id },
			});
			throw new UnauthorizedException('Sessão expirada');
		}

		await this.prisma.client.session.delete({
			where: { id: session.id },
		});

		const tokens = await this.generateAuthTokens({
			id: user.id,
			email: user.email ?? '',
		});

		return {
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			user: { id: user.id, email: user.email, name: user.name },
		};
	}

	async revokeSession(userId: string, refreshToken: string) {
		try {
			const payload = this.jwtService.verify<RefreshTokenPayload>(
				refreshToken,
				{ secret: process.env.JWT_REFRESH_SECRET },
			);
			await this.prisma.client.session.deleteMany({
				where: { token: payload.jti, userId },
			});
		} catch {
			// Token inválido ou já expirado — ignora
		}
	}

	private parseExpiresIn(value: string): number {
		const match = value.match(/^(\d+)([smhd])$/);
		if (!match) return 7 * 24 * 60 * 60 * 1000;
		const num = parseInt(match[1], 10);
		switch (match[2]) {
			case 's':
				return num * 1000;
			case 'm':
				return num * 60 * 1000;
			case 'h':
				return num * 60 * 60 * 1000;
			case 'd':
				return num * 24 * 60 * 60 * 1000;
			default:
				return 7 * 24 * 60 * 60 * 1000;
		}
	}
}
