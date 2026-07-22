import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtRefreshPayload {
	sub: string;
	email: string;
	jti: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
	Strategy,
	'jwt-refresh',
) {
	constructor(
		private prisma: PrismaService,
		configService: ConfigService,
	) {
		const secret = configService.get<string>('JWT_REFRESH_SECRET');
		if (!secret) {
			throw new Error('JWT_REFRESH_SECRET não definida no ambiente');
		}
		super({
			jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
			ignoreExpiration: false,
			secretOrKey: secret,
		});
	}

	async validate(payload: JwtRefreshPayload) {
		const user = await this.prisma.client.user.findUnique({
			where: { id: payload.sub },
		});

		if (!user || user.deletedAt) {
			throw new UnauthorizedException('Sessão expirada');
		}

		if (user.status === 'BANNED') {
			throw new UnauthorizedException('A tua conta está banida');
		}

		return { ...payload, user };
	}
}
