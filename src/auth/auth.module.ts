import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { BcryptService } from './services/bcrypt.service';
import { GoogleAuthService } from './services/google-auth.service';
import { TokenService } from './services/token.service';
import { ResendModule } from '../email/resend.module';

@Module({
	imports: [
		PassportModule.register({ defaultStrategy: 'jwt' }),
		JwtModule.register({
			secret: process.env.JWT_SECRET,
			signOptions: {
				expiresIn: (process.env.JWT_EXPIRES_IN ??
					'15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
			},
		}),
		ResendModule,
	],
	controllers: [AuthController],
	providers: [
		AuthService,
		JwtStrategy,
		JwtRefreshStrategy,
		BcryptService,
		GoogleAuthService,
		TokenService,
	],
	exports: [AuthService, JwtModule, PassportModule, BcryptService],
})
export class AuthModule {}
