import { Injectable, UnauthorizedException } from '@nestjs/common';

export interface GoogleUser {
	sub: string;
	email: string;
	name?: string;
	picture?: string;
	email_verified?: boolean;
}

@Injectable()
export class GoogleAuthService {
	async verifyToken(token: string): Promise<GoogleUser> {
		const isJwt = token.split('.').length === 3;

		if (isJwt) {
			return this.verifyIdToken(token);
		}

		return this.verifyAccessToken(token);
	}

	private async verifyAccessToken(accessToken: string): Promise<GoogleUser> {
		const response = await fetch(
			'https://www.googleapis.com/oauth2/v3/userinfo',
			{
				headers: { Authorization: `Bearer ${accessToken}` },
			},
		);

		if (!response.ok) {
			throw new UnauthorizedException('Token Google inválido');
		}

		return response.json() as Promise<GoogleUser>;
	}

	private async verifyIdToken(idToken: string): Promise<GoogleUser> {
		const response = await fetch(
			`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
		);

		if (!response.ok) {
			throw new UnauthorizedException('Token Google inválido');
		}

		const data = (await response.json()) as Record<string, string>;

		return {
			sub: data.sub,
			email: data.email,
			name: data.name,
			picture: data.picture,
			email_verified: data.email_verified === 'true',
		};
	}
}
