import {
	Controller,
	Get,
	Post,
	Delete,
	Param,
	Body,
	Query,
	Req,
	UseGuards,
	ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { ListDisputesDto } from './dto/list-disputes.dto';

@ApiTags('Disputas')
@Controller('disputes')
export class DisputesController {
	constructor(private disputesService: DisputesService) {}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Abrir disputa',
		description: 'Abre uma nova disputa para uma viagem',
	})
	@UseGuards(JwtAuthGuard)
	@Post()
	create(@Body(ValidationPipe) dto: CreateDisputeDto, @Req() req: Request) {
		const user = req.user as { id: string };
		return this.disputesService.create(dto, user.id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar disputas',
		description: 'Lista disputas com paginação e filtros',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Get()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	list(@Query(ValidationPipe) dto: ListDisputesDto) {
		return this.disputesService.list(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter disputa',
		description: 'Retorna os dados de uma disputa específica',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Get(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	findById(@Param('id') id: string) {
		return this.disputesService.findById(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Resolver disputa',
		description: 'Define a resolução da disputa e marca como resolvida',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Post(':id/resolve')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	resolve(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: ResolveDisputeDto,
	) {
		return this.disputesService.resolve(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover disputa',
		description: 'Remove (soft delete) uma disputa',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Delete(':id')
	@Roles(UserRole.SUPER_ADMIN)
	remove(@Param('id') id: string) {
		return this.disputesService.remove(id);
	}
}
