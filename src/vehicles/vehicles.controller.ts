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
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { ListVehiclesDto } from './dto/list-vehicles.dto';
import { UpdateVehicleStatusDto } from './dto/update-vehicle-status.dto';
import { UpdateVehicleUrlDto } from './dto/update-vehicle-url.dto';

@ApiTags('Vehicles')
@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehiclesController {
	constructor(private vehiclesService: VehiclesService) {}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Criar veículo',
		description: 'Cria um novo veículo e define como ativo do motorista',
	})
	@Post()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	create(@Body(ValidationPipe) dto: CreateVehicleDto) {
		return this.vehiclesService.create(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar veículos',
		description: 'Lista todos os veículos com paginação e filtros',
	})
	@Get()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	list(@Query(ValidationPipe) dto: ListVehiclesDto) {
		return this.vehiclesService.list(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter veículo',
		description: 'Retorna os dados de um veículo específico',
	})
	@Get(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	findById(@Param('id') id: string) {
		return this.vehiclesService.findById(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar veículo',
		description: 'Atualiza os dados de um veículo',
	})
	@Patch(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	update(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateVehicleDto,
	) {
		return this.vehiclesService.update(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover veículo',
		description: 'Remove (soft delete) um veículo',
	})
	@Delete(':id')
	@Roles(UserRole.SUPER_ADMIN)
	remove(@Param('id') id: string) {
		return this.vehiclesService.remove(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Alterar estado',
		description:
			'Altera o estado do veículo (ACTIVE/BLOCKED/MAINTENANCE). Se ACTIVE, define como veículo ativo do motorista.',
	})
	@Patch(':id/status')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.VALIDATOR)
	updateStatus(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateVehicleStatusDto,
	) {
		return this.vehiclesService.updateStatus(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar foto',
		description:
			'Atualiza a foto do veículo (Cloudinary). Apaga a anterior.',
	})
	@Patch(':id/photo')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	updatePhoto(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateVehicleUrlDto,
	) {
		return this.vehiclesService.updatePhoto(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar documento',
		description:
			'Atualiza o documento do veículo (Cloudinary). Apaga o anterior.',
	})
	@Patch(':id/document')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	updateDocument(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateVehicleUrlDto,
	) {
		return this.vehiclesService.updateDocument(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar seguro',
		description:
			'Atualiza o seguro do veículo (Cloudinary). Apaga o anterior.',
	})
	@Patch(':id/insurance')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	updateInsurance(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateVehicleUrlDto,
	) {
		return this.vehiclesService.updateInsurance(id, dto);
	}
}
