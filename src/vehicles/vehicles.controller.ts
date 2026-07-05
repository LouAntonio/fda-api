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
	ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DriversService } from '../drivers/drivers.service';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { ListVehiclesDto } from './dto/list-vehicles.dto';
import { UpdateVehicleStatusDto } from './dto/update-vehicle-status.dto';
import { UpdateVehicleUrlDto } from './dto/update-vehicle-url.dto';

@ApiTags('Vehicles')
@Controller('vehicles')
export class VehiclesController {
	constructor(
		private vehiclesService: VehiclesService,
		private driversService: DriversService,
	) {}

	// ─── Self-service endpoints (DRIVER role) ─────────────────────────

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Meus veículos',
		description: 'Lista os veículos do motorista autenticado',
	})
	@UseGuards(JwtAuthGuard)
	@Get('me')
	async listMyVehicles(@Req() req: Request) {
		const user = req.user as { id: string };
		const driver = await this.driversService.findByUserId(user.id);
		return this.vehiclesService.findByDriverId(driver.id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Criar meu veículo',
		description: 'Regista um novo veículo para o motorista autenticado',
	})
	@UseGuards(JwtAuthGuard)
	@Post('me')
	async createMyVehicle(
		@Req() req: Request,
		@Body(ValidationPipe) dto: CreateVehicleDto,
	) {
		const user = req.user as { id: string };
		const driver = await this.driversService.findByUserId(user.id);
		return this.vehiclesService.createForDriver(driver.id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar meu veículo',
		description: 'Atualiza os dados de um dos seus veículos',
	})
	@UseGuards(JwtAuthGuard)
	@Patch('me/:id')
	async updateMyVehicle(
		@Req() req: Request,
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateVehicleDto,
	) {
		const user = req.user as { id: string };
		const driver = await this.driversService.findByUserId(user.id);
		await this.vehiclesService.validateOwnership(id, driver.id);
		return this.vehiclesService.update(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover meu veículo',
		description: 'Remove um dos seus veículos (soft delete)',
	})
	@UseGuards(JwtAuthGuard)
	@Delete('me/:id')
	async removeMyVehicle(@Req() req: Request, @Param('id') id: string) {
		const user = req.user as { id: string };
		const driver = await this.driversService.findByUserId(user.id);
		await this.vehiclesService.validateOwnership(id, driver.id);
		return this.vehiclesService.remove(id);
	}

	// ─── Admin endpoints ──────────────────────────────────────────────

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Criar veículo (admin)',
		description: 'Cria um novo veículo e define como ativo do motorista',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Post()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	create(@Body(ValidationPipe) dto: CreateVehicleDto) {
		return this.vehiclesService.create(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar veículos (admin)',
		description: 'Lista todos os veículos com paginação e filtros',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Get()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	list(@Query(ValidationPipe) dto: ListVehiclesDto) {
		return this.vehiclesService.list(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter veículo (admin)',
		description: 'Retorna os dados de um veículo específico',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Get(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	findById(@Param('id') id: string) {
		return this.vehiclesService.findById(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar veículo (admin)',
		description: 'Atualiza os dados de um veículo',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
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
		summary: 'Remover veículo (admin)',
		description: 'Remove (soft delete) um veículo',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Delete(':id')
	@Roles(UserRole.SUPER_ADMIN)
	remove(@Param('id') id: string) {
		return this.vehiclesService.remove(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Alterar estado (admin)',
		description:
			'Altera o estado do veículo (ACTIVE/BLOCKED/MAINTENANCE). Se ACTIVE, define como veículo ativo do motorista.',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
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
		summary: 'Atualizar foto (admin)',
		description:
			'Atualiza a foto do veículo (Cloudinary). Apaga a anterior.',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
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
		summary: 'Atualizar documento (admin)',
		description:
			'Atualiza o documento do veículo (Cloudinary). Apaga o anterior.',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
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
		summary: 'Atualizar seguro (admin)',
		description:
			'Atualiza o seguro do veículo (Cloudinary). Apaga o anterior.',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Patch(':id/insurance')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	updateInsurance(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateVehicleUrlDto,
	) {
		return this.vehiclesService.updateInsurance(id, dto);
	}
}
