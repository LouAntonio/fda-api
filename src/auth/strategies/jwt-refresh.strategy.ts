import { Injectable, UnauthorizedException } from '@nestjs/common';
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
	constructor(private prisma: PrismaService) {
		super({
			jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
			ignoreExpiration: false,
			secretOrKey: process.env.JWT_REFRESH_SECRET!,
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
