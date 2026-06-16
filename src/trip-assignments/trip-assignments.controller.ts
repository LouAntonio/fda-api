import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	Param,
	Body,
	Query,
	UseGuards,
	ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TripAssignmentsService } from './trip-assignments.service';
import { CreateTripAssignmentDto } from './dto/create-trip-assignment.dto';
import { UpdateTripAssignmentDto } from './dto/update-trip-assignment.dto';
import { ListTripAssignmentsDto } from './dto/list-trip-assignments.dto';

@ApiTags('Atribuições de Viagem')
@Controller('trip-assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TripAssignmentsController {
	constructor(private tripAssignmentsService: TripAssignmentsService) {}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Criar atribuição',
		description: 'Cria uma nova oferta de viagem para um motorista',
	})
	@Post()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	create(@Body(ValidationPipe) dto: CreateTripAssignmentDto) {
		return this.tripAssignmentsService.create(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar atribuições',
		description: 'Lista todas as atribuições com paginação e filtros',
	})
	@Get()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	list(@Query(ValidationPipe) dto: ListTripAssignmentsDto) {
		return this.tripAssignmentsService.list(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter atribuição',
		description: 'Retorna os dados de uma atribuição específica',
	})
	@Get(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	findById(@Param('id') id: string) {
		return this.tripAssignmentsService.findById(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar atribuição',
		description:
			'Atualiza o estado de uma atribuição (ACEITAR/REJEITAR/EXPIRAR)',
	})
	@Patch(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.DRIVER)
	update(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateTripAssignmentDto,
	) {
		return this.tripAssignmentsService.update(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover atribuição',
		description: 'Remove (soft delete) uma atribuição',
	})
	@Delete(':id')
	@Roles(UserRole.SUPER_ADMIN)
	remove(@Param('id') id: string) {
		return this.tripAssignmentsService.remove(id);
	}
}
