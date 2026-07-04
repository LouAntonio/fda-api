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
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ListCouponsDto } from './dto/list-coupons.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
	constructor(private couponsService: CouponsService) {}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Criar cupão',
		description: 'Cria um novo cupão de desconto (SUPER_ADMIN, OPERATIONS)',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Post()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	create(@Body(ValidationPipe) dto: CreateCouponDto) {
		return this.couponsService.create(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar cupões',
		description: 'Lista todos os cupões com paginação e filtros',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Get()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.FINANCE)
	list(@Query(ValidationPipe) dto: ListCouponsDto) {
		return this.couponsService.list(dto);
	}

	@ApiOperation({
		summary: 'Listar promoções activas',
		description:
			'Retorna todos os cupões/promoções activos e disponíveis para o público',
	})
	@Get('active')
	findActive() {
		return this.couponsService.findActive();
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter cupão',
		description: 'Retorna os dados de um cupão específico',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Get(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	findById(@Param('id') id: string) {
		return this.couponsService.findById(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar cupão',
		description: 'Atualiza os dados de um cupão (SUPER_ADMIN, OPERATIONS)',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Patch(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	update(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateCouponDto,
	) {
		return this.couponsService.update(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover cupão',
		description: 'Remove (soft delete) um cupão (apenas SUPER_ADMIN)',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Delete(':id')
	@Roles(UserRole.SUPER_ADMIN)
	remove(@Param('id') id: string) {
		return this.couponsService.remove(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Ativar/desativar cupão',
		description:
			'Alterna o estado ativo/inativo de um cupão (SUPER_ADMIN, OPERATIONS)',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Patch(':id/toggle')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	toggleActive(@Param('id') id: string) {
		return this.couponsService.toggleActive(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Validar cupão',
		description:
			'Valida um código de cupão e calcula o desconto (qualquer utilizador autenticado)',
	})
	@UseGuards(JwtAuthGuard)
	@Post('validate')
	validate(
		@Body(ValidationPipe) dto: ValidateCouponDto,
		@Req() req: Request,
	) {
		const user = req.user as { id: string };
		return this.couponsService.validate({
			...dto,
			userId: user.id,
		});
	}
}
