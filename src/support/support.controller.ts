import {
	Body,
	Controller,
	Get,
	Patch,
	Param,
	Post,
	Query,
	Req,
	UseGuards,
	ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { ListSupportTicketsDto } from './dto/list-support-tickets.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';

@ApiTags('Support')
@Controller('support')
export class SupportController {
	constructor(private supportService: SupportService) {}

	@ApiOperation({
		summary: 'Enviar mensagem de contacto',
		description:
			'Recebe uma mensagem do formulário de contacto/suporte (autenticado ou não)',
	})
	@Throttle({ default: { limit: 5, ttl: 60000 } })
	@Post('contact')
	create(
		@Body(ValidationPipe) dto: CreateSupportTicketDto,
		@Req() req: Request,
	) {
		const user = req.user as { id: string } | undefined;
		return this.supportService.create(user?.id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar tickets de suporte (admin)',
		description: 'Lista paginada com filtro por status',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	@Get()
	list(@Query(ValidationPipe) dto: ListSupportTicketsDto) {
		return this.supportService.findAll(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar ticket de suporte (admin)',
		description:
			'Altera o status de um ticket (OPEN → IN_PROGRESS → RESOLVED)',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	@Patch(':id')
	update(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateSupportTicketDto,
	) {
		return this.supportService.update(id, dto);
	}
}
