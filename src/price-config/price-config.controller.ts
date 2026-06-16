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
import { PriceConfigService } from './price-config.service';
import { CreatePriceConfigDto } from './dto/create-price-config.dto';
import { UpdatePriceConfigDto } from './dto/update-price-config.dto';
import { ListPriceConfigsDto } from './dto/list-price-configs.dto';

@ApiTags('Preços')
@Controller('price-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PriceConfigController {
	constructor(private priceConfigService: PriceConfigService) {}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Criar configuração de preço',
		description:
			'Cria uma nova configuração de preço para um tipo de veículo',
	})
	@Post()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	create(@Body(ValidationPipe) dto: CreatePriceConfigDto) {
		return this.priceConfigService.create(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar configurações de preço',
		description:
			'Lista todas as configurações de preço com paginação e filtros',
	})
	@Get()
	@Roles(
		UserRole.SUPER_ADMIN,
		UserRole.OPERATIONS,
		UserRole.SUPPORT,
		UserRole.FINANCE,
	)
	list(@Query(ValidationPipe) dto: ListPriceConfigsDto) {
		return this.priceConfigService.list(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter configuração de preço',
		description: 'Retorna os dados de uma configuração de preço específica',
	})
	@Get(':id')
	@Roles(
		UserRole.SUPER_ADMIN,
		UserRole.OPERATIONS,
		UserRole.SUPPORT,
		UserRole.FINANCE,
	)
	findById(@Param('id') id: string) {
		return this.priceConfigService.findById(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar configuração de preço',
		description:
			'Atualiza os dados de uma configuração de preço (SUPER_ADMIN, OPERATIONS)',
	})
	@Patch(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	update(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdatePriceConfigDto,
	) {
		return this.priceConfigService.update(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover configuração de preço',
		description: 'Desativa uma configuração de preço (apenas SUPER_ADMIN)',
	})
	@Delete(':id')
	@Roles(UserRole.SUPER_ADMIN)
	remove(@Param('id') id: string) {
		return this.priceConfigService.remove(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Ativar/desativar configuração de preço',
		description:
			'Alterna o estado ativo/inativo de uma configuração de preço',
	})
	@Patch(':id/toggle')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	toggleActive(@Param('id') id: string) {
		return this.priceConfigService.toggleActive(id);
	}
}
