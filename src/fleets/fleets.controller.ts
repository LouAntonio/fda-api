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
import { FleetsService } from './fleets.service';
import { CreateFleetDto } from './dto/create-fleet.dto';
import { UpdateFleetDto } from './dto/update-fleet.dto';
import { ListFleetsDto } from './dto/list-fleets.dto';
import { AddDriverDto } from './dto/add-driver.dto';

@ApiTags('Fleets')
@Controller('fleets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FleetsController {
	constructor(private fleetsService: FleetsService) {}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Criar frota',
		description: 'Cria uma nova frota de motoristas',
	})
	@Post()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.FLEET_MANAGER)
	create(@Body(ValidationPipe) dto: CreateFleetDto) {
		return this.fleetsService.create(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar frotas',
		description: 'Lista todas as frotas com paginação e filtros',
	})
	@Get()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.FLEET_MANAGER)
	list(@Query(ValidationPipe) dto: ListFleetsDto) {
		return this.fleetsService.list(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter frota',
		description:
			'Retorna os dados de uma frota com os motoristas vinculados',
	})
	@Get(':id')
	@Roles(
		UserRole.SUPER_ADMIN,
		UserRole.OPERATIONS,
		UserRole.FLEET_MANAGER,
		UserRole.SUPPORT,
	)
	findById(@Param('id') id: string) {
		return this.fleetsService.findById(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar frota',
		description: 'Atualiza o nome da frota',
	})
	@Patch(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	update(@Param('id') id: string, @Body(ValidationPipe) dto: UpdateFleetDto) {
		return this.fleetsService.update(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover frota',
		description:
			'Remove a frota e desvincula todos os motoristas que pertenciam a ela',
	})
	@Delete(':id')
	@Roles(UserRole.SUPER_ADMIN)
	remove(@Param('id') id: string) {
		return this.fleetsService.remove(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Adicionar motorista',
		description: 'Adiciona um motorista à frota',
	})
	@Post(':id/drivers')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	addDriver(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: AddDriverDto,
	) {
		return this.fleetsService.addDriver(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover motorista',
		description: 'Remove um motorista da frota',
	})
	@Delete(':id/drivers/:driverId')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	removeDriver(@Param('id') id: string, @Param('driverId') driverId: string) {
		return this.fleetsService.removeDriver(id, driverId);
	}
}
