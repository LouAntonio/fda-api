import {
	Controller,
	Get,
	Post,
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
import { TripEventsService } from './trip-events.service';
import { CreateTripEventDto } from './dto/create-trip-event.dto';
import { ListTripEventsDto } from './dto/list-trip-events.dto';

@ApiTags('Eventos de Viagem')
@Controller('trip-events')
export class TripEventsController {
	constructor(private tripEventsService: TripEventsService) {}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Criar evento',
		description: 'Regista manualmente um evento de viagem',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Post()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	create(@Body(ValidationPipe) dto: CreateTripEventDto) {
		return this.tripEventsService.create(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar eventos',
		description: 'Lista eventos de viagem com paginação e filtros',
	})
	@UseGuards(JwtAuthGuard)
	@Get()
	list(@Query(ValidationPipe) dto: ListTripEventsDto) {
		return this.tripEventsService.list(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter evento',
		description: 'Retorna os dados de um evento específico',
	})
	@UseGuards(JwtAuthGuard)
	@Get(':id')
	findById(@Param('id') id: string) {
		return this.tripEventsService.findById(id);
	}
}
