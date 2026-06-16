import {
	Controller,
	Get,
	Patch,
	Param,
	Body,
	Query,
	Req,
	UseGuards,
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

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
	constructor(private usersService: UsersService) {}

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
}
