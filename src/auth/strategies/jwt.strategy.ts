import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
	sub: string;
	email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private prisma: PrismaService) {
		const secret = process.env.JWT_SECRET;
		if (!secret) {
			throw new Error(
				'JWT_SECRET não definida. Verifique o ficheiro .env.',
			);
		}
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: secret,
		});
	}

	async validate(payload: JwtPayload) {
		const user = await this.prisma.client.user.findUnique({
			where: { id: payload.sub },
		});

		if (!user || user.deletedAt) {
			throw new UnauthorizedException('Utilizador não encontrado');
		}

		if (user.status === 'BANNED') {
			throw new UnauthorizedException('A tua conta está banida');
		}

		return user;
	}
}
