import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	Param,
	Body,
	Query,
	Req,
	UseGuards,
	ForbiddenException,
	ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
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

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
	constructor(private usersService: UsersService) {}

	private checkOwnershipOrAdmin(id: string, req: Request): void {
		const user = req.user as { id: string; role: UserRole };
		if (user.id !== id) {
			const isAdmin =
				user.role === UserRole.SUPER_ADMIN ||
				user.role === UserRole.OPERATIONS ||
				user.role === UserRole.SUPPORT;
			if (!isAdmin) {
				throw new ForbiddenException(
					'Não tem permissão para aceder a este recurso',
				);
			}
		}
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar utilizadores',
		description: 'Lista todos os utilizadores (apenas SUPER_ADMIN)',
	})
	@Get()
	@Roles(UserRole.SUPER_ADMIN)
	list(@Query(ValidationPipe) dto: ListUsersDto) {
		return this.usersService.list(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Criar utilizador',
		description: 'Cria um novo utilizador manualmente (apenas SUPER_ADMIN)',
	})
	@Post()
	@Roles(UserRole.SUPER_ADMIN)
	create(@Body(ValidationPipe) dto: CreateUserDto, @Req() req: Request) {
		const admin = req.user as { id: string };
		return this.usersService.create(admin.id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Estatísticas do perfil',
		description:
			'Retorna estatísticas agregadas do utilizador autenticado (total viagens, distância, tempo, gasto)',
	})
	@Get('me/stats')
	getStats(@Req() req: Request) {
		const user = req.user as { id: string };
		return this.usersService.getStats(user.id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter utilizador',
		description: 'Retorna os dados de um utilizador específico',
	})
	@Get(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	findById(
		@Param('id') id: string,
		@Query(ValidationPipe) query: UserQueryDto,
	) {
		return this.usersService.findById(id, query);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar utilizador',
		description: 'Atualiza os dados de um utilizador (apenas SUPER_ADMIN)',
	})
	@Patch(':id')
	@Roles(UserRole.SUPER_ADMIN)
	update(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateUserDto,
		@Req() req: Request,
	) {
		const admin = req.user as { id: string };
		return this.usersService.update(admin.id, id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover utilizador',
		description: 'Remove (soft delete) um utilizador (apenas SUPER_ADMIN)',
	})
	@Delete(':id')
	@Roles(UserRole.SUPER_ADMIN)
	remove(@Param('id') id: string, @Req() req: Request) {
		const admin = req.user as { id: string };
		return this.usersService.remove(admin.id, id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Alterar cargo',
		description: 'Altera o cargo de um utilizador (apenas SUPER_ADMIN)',
	})
	@Patch(':id/role')
	@Roles(UserRole.SUPER_ADMIN)
	updateRole(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateRoleDto,
		@Req() req: Request,
	) {
		const admin = req.user as { id: string };
		return this.usersService.updateRole(admin.id, id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Banir utilizador',
		description: 'Bane um utilizador (apenas SUPER_ADMIN)',
	})
	@Patch(':id/ban')
	@Roles(UserRole.SUPER_ADMIN)
	ban(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: BanUserDto,
		@Req() req: Request,
	) {
		const admin = req.user as { id: string };
		return this.usersService.ban(admin.id, id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Desbanir utilizador',
		description: 'Remove o banimento de um utilizador (apenas SUPER_ADMIN)',
	})
	@Patch(':id/unban')
	@Roles(UserRole.SUPER_ADMIN)
	unban(@Param('id') id: string, @Req() req: Request) {
		const admin = req.user as { id: string };
		return this.usersService.unban(admin.id, id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar contacto de emergência',
		description: 'Atualiza o contacto de emergência do próprio utilizador',
	})
	@Patch('me/emergency-contact')
	updateEmergencyContact(
		@Req() req: Request,
		@Body(ValidationPipe) dto: EmergencyContactDto,
	) {
		const user = req.user as { id: string };
		return this.usersService.updateEmergencyContact(user.id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Registar dispositivo',
		description: 'Regista o ID do dispositivo do próprio utilizador',
	})
	@Patch('me/device')
	registerDevice(
		@Req() req: Request,
		@Body(ValidationPipe) dto: RegisterDeviceDto,
	) {
		const user = req.user as { id: string };
		return this.usersService.registerDevice(user.id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Solicitar verificação de telefone',
		description:
			'Envia código de verificação para o telefone do utilizador',
	})
	@Post('me/verify-phone')
	sendPhoneVerification(
		@Req() req: Request,
		@Body(ValidationPipe) dto: VerifyPhoneDto,
	) {
		const user = req.user as { id: string };
		return this.usersService.sendPhoneVerification(user.id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Confirmar verificação de telefone',
		description: 'Confirma o código de verificação do telefone',
	})
	@Patch('me/verify-phone')
	confirmPhoneVerification(
		@Req() req: Request,
		@Body(ValidationPipe) dto: ConfirmPhoneDto,
	) {
		const user = req.user as { id: string };
		return this.usersService.confirmPhoneVerification(user.id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar endereços',
		description: 'Lista os endereços de um utilizador',
	})
	@Get(':id/addresses')
	listAddresses(@Param('id') id: string, @Req() req: Request) {
		this.checkOwnershipOrAdmin(id, req);
		return this.usersService.listAddresses(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Criar endereço',
		description: 'Adiciona um novo endereço a um utilizador',
	})
	@Post(':id/addresses')
	createAddress(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: CreateAddressDto,
		@Req() req: Request,
	) {
		this.checkOwnershipOrAdmin(id, req);
		return this.usersService.createAddress(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar endereço',
		description: 'Atualiza um endereço de um utilizador',
	})
	@Patch(':id/addresses/:addressId')
	updateAddress(
		@Param('id') id: string,
		@Param('addressId') addressId: string,
		@Body(ValidationPipe) dto: UpdateAddressDto,
		@Req() req: Request,
	) {
		this.checkOwnershipOrAdmin(id, req);
		return this.usersService.updateAddress(id, addressId, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover endereço',
		description: 'Remove um endereço de um utilizador',
	})
	@Delete(':id/addresses/:addressId')
	deleteAddress(
		@Param('id') id: string,
		@Param('addressId') addressId: string,
		@Req() req: Request,
	) {
		this.checkOwnershipOrAdmin(id, req);
		return this.usersService.deleteAddress(id, addressId);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar sessões',
		description: 'Lista as sessões ativas de um utilizador',
	})
	@Get(':id/sessions')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	listSessions(@Param('id') id: string) {
		return this.usersService.listSessions(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Revogar sessão',
		description: 'Revoga uma sessão específica de um utilizador',
	})
	@Delete(':id/sessions/:sessionId')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	revokeSession(
		@Param('id') id: string,
		@Param('sessionId') sessionId: string,
	) {
		return this.usersService.revokeSession(id, sessionId);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Registar meu push token',
		description:
			'Regista o push token do dispositivo do próprio utilizador autenticado',
	})
	@UseGuards(JwtAuthGuard)
	@Post('me/push-tokens')
	createMyPushToken(
		@Req() req: Request,
		@Body(ValidationPipe) dto: CreatePushTokenDto,
	) {
		const user = req.user as { id: string };
		return this.usersService.createPushToken(user.id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar push tokens',
		description: 'Lista os push tokens de um utilizador',
	})
	@Get(':id/push-tokens')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	listPushTokens(@Param('id') id: string) {
		return this.usersService.listPushTokens(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter preferências de notificação',
		description:
			'Retorna as preferências de notificação do próprio utilizador',
	})
	@UseGuards(JwtAuthGuard)
	@Get('me/notification-preferences')
	getNotificationPreferences(@Req() req: Request) {
		const user = req.user as { id: string };
		return this.usersService.getNotificationPreferences(user.id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar preferências de notificação',
		description:
			'Atualiza as preferências de notificação do próprio utilizador',
	})
	@UseGuards(JwtAuthGuard)
	@Patch('me/notification-preferences')
	updateNotificationPreferences(
		@Req() req: Request,
		@Body(ValidationPipe) dto: UpdateNotificationPrefsDto,
	) {
		const user = req.user as { id: string };
		return this.usersService.updateNotificationPreferences(user.id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Registar push token',
		description: 'Regista um novo push token para o utilizador',
	})
	@Post(':id/push-tokens')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	createPushToken(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: CreatePushTokenDto,
	) {
		return this.usersService.createPushToken(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover push token',
		description: 'Remove um push token do utilizador',
	})
	@Delete(':id/push-tokens/:tokenId')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	removePushToken(
		@Param('id') id: string,
		@Param('tokenId') tokenId: string,
	) {
		return this.usersService.removePushToken(id, tokenId);
	}
}
