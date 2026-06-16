import {
	Controller,
	Get,
	Post,
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
import { TripLocationPointsService } from './trip-location-points.service';
import { CreateTripLocationPointDto } from './dto/create-trip-location-point.dto';
import { ListTripLocationPointsDto } from './dto/list-trip-location-points.dto';

@ApiTags('Pontos de Localização')
@Controller('trip-location-points')
export class TripLocationPointsController {
	constructor(private tripLocationPointsService: TripLocationPointsService) {}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Registar ponto GPS',
		description: 'Regista um ponto de localização para uma viagem',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Post()
	@Roles(UserRole.DRIVER, UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	create(@Body(ValidationPipe) dto: CreateTripLocationPointDto) {
		return this.tripLocationPointsService.create(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar pontos GPS',
		description: 'Lista pontos de localização com paginação e filtros',
	})
	@UseGuards(JwtAuthGuard)
	@Get()
	list(@Query(ValidationPipe) dto: ListTripLocationPointsDto) {
		return this.tripLocationPointsService.list(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter ponto GPS',
		description: 'Retorna os dados de um ponto de localização específico',
	})
	@UseGuards(JwtAuthGuard)
	@Get(':id')
	findById(@Param('id') id: string) {
		return this.tripLocationPointsService.findById(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover ponto GPS',
		description: 'Remove um ponto de localização',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Delete(':id')
	@Roles(UserRole.SUPER_ADMIN)
	remove(@Param('id') id: string) {
		return this.tripLocationPointsService.remove(id);
	}
}
