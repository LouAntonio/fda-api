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
import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { ListZonesDto } from './dto/list-zones.dto';

@ApiTags('Zonas')
@Controller('zones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ZonesController {
	constructor(private zonesService: ZonesService) {}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Criar zona',
		description: 'Cria uma nova zona geográfica com preço dinâmico',
	})
	@Post()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	create(@Body(ValidationPipe) dto: CreateZoneDto) {
		return this.zonesService.create(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar zonas',
		description: 'Lista todas as zonas com paginação e filtros',
	})
	@Get()
	@Roles(
		UserRole.SUPER_ADMIN,
		UserRole.OPERATIONS,
		UserRole.SUPPORT,
		UserRole.FINANCE,
	)
	list(@Query(ValidationPipe) dto: ListZonesDto) {
		return this.zonesService.list(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter zona',
		description: 'Retorna os dados de uma zona específica',
	})
	@Get(':id')
	@Roles(
		UserRole.SUPER_ADMIN,
		UserRole.OPERATIONS,
		UserRole.SUPPORT,
		UserRole.FINANCE,
	)
	findById(@Param('id') id: string) {
		return this.zonesService.findById(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar zona',
		description: 'Atualiza os dados de uma zona (SUPER_ADMIN, OPERATIONS)',
	})
	@Patch(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	update(@Param('id') id: string, @Body(ValidationPipe) dto: UpdateZoneDto) {
		return this.zonesService.update(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover zona',
		description: 'Desativa uma zona (apenas SUPER_ADMIN)',
	})
	@Delete(':id')
	@Roles(UserRole.SUPER_ADMIN)
	remove(@Param('id') id: string) {
		return this.zonesService.remove(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Ativar/desativar zona',
		description: 'Alterna o estado ativo/inativo de uma zona',
	})
	@Patch(':id/toggle')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	toggleActive(@Param('id') id: string) {
		return this.zonesService.toggleActive(id);
	}
}
