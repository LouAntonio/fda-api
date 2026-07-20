import {
	Body,
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	UseGuards,
	Req,
	ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LinkGoogleDto } from './dto/link-google.dto';
import { LinkPasswordDto } from './dto/link-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
	constructor(private authService: AuthService) {}

	@ApiOperation({
		summary: 'Registar utilizador',
		description: 'Cria uma nova conta de utilizador',
	})
	@Throttle({ default: { limit: 3, ttl: 60000 } })
	@Post('register')
	register(@Body(ValidationPipe) dto: RegisterDto) {
		return this.authService.register(dto);
	}

	@ApiOperation({
		summary: 'Verificar email',
		description: 'Verifica o email do utilizador com o token recebido',
	})
	@Throttle({ default: { limit: 5, ttl: 60000 } })
	@Post('verify-email')
	verifyEmail(@Body(ValidationPipe) dto: VerifyEmailDto) {
		return this.authService.verifyEmail(dto);
	}

	@ApiOperation({
		summary: 'Reenviar verificação',
		description: 'Reenvia o email de verificação de conta',
	})
	@Throttle({ default: { limit: 3, ttl: 60000 } })
	@Post('resend-verification')
	resendVerification(@Body(ValidationPipe) dto: ResendVerificationDto) {
		return this.authService.resendVerification(dto);
	}

	@ApiOperation({
		summary: 'Iniciar sessão',
		description: 'Autentica o utilizador com telefone e palavra-passe',
	})
	@Throttle({ default: { limit: 5, ttl: 60000 } })
	@Post('login')
	login(@Body(ValidationPipe) dto: LoginDto) {
		return this.authService.login(dto);
	}

	@ApiOperation({
		summary: 'Login com Google',
		description: 'Autentica o utilizador com Google OAuth',
	})
	@Throttle({ default: { limit: 5, ttl: 60000 } })
	@Post('google')
	googleLogin(@Body(ValidationPipe) dto: GoogleLoginDto) {
		return this.authService.googleLogin(dto.accessToken);
	}

	@ApiOperation({
		summary: 'Refresh token',
		description: 'Gera novos tokens a partir do refresh token',
	})
	@Throttle({ default: { limit: 10, ttl: 60000 } })
	@Post('refresh')
	refresh(@Body(ValidationPipe) dto: RefreshTokenDto) {
		return this.authService.refresh(dto.refreshToken);
	}

	@ApiOperation({
		summary: 'Recuperar palavra-passe',
		description: 'Envia email com link para redefinir a palavra-passe',
	})
	@Throttle({ default: { limit: 3, ttl: 60000 } })
	@Post('forgot-password')
	forgotPassword(@Body(ValidationPipe) dto: ForgotPasswordDto) {
		return this.authService.forgotPassword(dto);
	}

	@ApiOperation({
		summary: 'Verificar token de redefinição',
		description:
			'Valida se o token de redefinição de palavra-passe é válido',
	})
	@Throttle({ default: { limit: 10, ttl: 60000 } })
	@Post('verify-reset-token')
	verifyResetToken(@Body('token') token: string) {
		return this.authService.verifyResetToken(token);
	}

	@ApiOperation({
		summary: 'Redefinir palavra-passe',
		description: 'Redefine a palavra-passe com o token recebido',
	})
	@Throttle({ default: { limit: 3, ttl: 60000 } })
	@Post('reset-password')
	resetPassword(@Body(ValidationPipe) dto: ResetPasswordDto) {
		return this.authService.resetPassword(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Vincular conta Google',
		description: 'Vincular conta Google ao utilizador autenticado',
	})
	@UseGuards(JwtAuthGuard)
	@Post('link/google')
	linkGoogle(@Req() req: Request, @Body(ValidationPipe) dto: LinkGoogleDto) {
		const user = req.user as { id: string };
		return this.authService.linkGoogle(user.id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Desvincular conta Google',
		description:
			'Remove a conta Google vinculada ao utilizador autenticado',
	})
	@UseGuards(JwtAuthGuard)
	@Post('unlink/google')
	unlinkGoogle(@Req() req: Request) {
		const user = req.user as { id: string };
		return this.authService.unlinkGoogle(user.id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Vincular palavra-passe',
		description:
			'Define uma palavra-passe para a conta autenticada (útil após login com Google)',
	})
	@UseGuards(JwtAuthGuard)
	@Post('link/password')
	linkPassword(
		@Req() req: Request,
		@Body(ValidationPipe) dto: LinkPasswordDto,
	) {
		const user = req.user as { id: string };
		return this.authService.linkPassword(user.id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Alterar palavra-passe',
		description:
			'Altera a palavra-passe do utilizador autenticado (requer palavra-passe atual)',
	})
	@UseGuards(JwtAuthGuard)
	@Post('change-password')
	changePassword(
		@Req() req: Request,
		@Body(ValidationPipe) dto: ChangePasswordDto,
	) {
		const user = req.user as { id: string };
		return this.authService.changePassword(user.id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Alterar email',
		description:
			'Altera o email do utilizador autenticado e envia verificação para o novo email',
	})
	@UseGuards(JwtAuthGuard)
	@Post('change-email')
	changeEmail(
		@Req() req: Request,
		@Body(ValidationPipe) dto: ChangeEmailDto,
	) {
		const user = req.user as { id: string };
		return this.authService.changeEmail(user.id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar perfil',
		description: 'Atualiza nome e/ou telefone do utilizador autenticado',
	})
	@UseGuards(JwtAuthGuard)
	@Patch('profile')
	updateProfile(
		@Req() req: Request,
		@Body(ValidationPipe) dto: UpdateProfileDto,
	) {
		const user = req.user as { id: string };
		return this.authService.updateProfile(user.id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Terminar sessão',
		description: 'Invalida o refresh token do utilizador',
	})
	@UseGuards(JwtAuthGuard)
	@Post('logout')
	logout(@Req() req: Request, @Body(ValidationPipe) dto: RefreshTokenDto) {
		const user = req.user as { id: string };
		return this.authService.logout(user.id, dto?.refreshToken);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Eliminar conta',
		description:
			'Elimina permanentemente a conta do utilizador autenticado (soft-delete)',
	})
	@UseGuards(JwtAuthGuard)
	@Delete('account')
	deleteAccount(
		@Req() req: Request,
		@Body(ValidationPipe) dto: DeleteAccountDto,
	) {
		const user = req.user as { id: string };
		return this.authService.deleteAccount(user.id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Perfil atual',
		description: 'Retorna os dados do utilizador autenticado',
	})
	@UseGuards(JwtAuthGuard)
	@Get('me')
	me(@Req() req: Request) {
		const user = req.user as { id: string };
		return this.authService.me(user.id);
	}
}
