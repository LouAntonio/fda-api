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
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
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
		summary: 'Iniciar sessão',
		description: 'Autentica o utilizador com telefone e palavra-passe',
	})
	@Throttle({ default: { limit: 5, ttl: 60000 } })
	@Post('login')
	login(@Body(ValidationPipe) dto: LoginDto) {
		return this.authService.login(dto);
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
