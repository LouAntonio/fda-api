import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	Param,
	Body,
	UseGuards,
	ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DeliveryDetailsService } from './delivery-details.service';
import { CreateDeliveryDetailsDto } from './dto/create-delivery-details.dto';
import { UpdateDeliveryDetailsDto } from './dto/update-delivery-details.dto';

@ApiTags('Detalhes de Entrega')
@Controller('delivery-details')
export class DeliveryDetailsController {
	constructor(private deliveryDetailsService: DeliveryDetailsService) {}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Criar detalhes de entrega',
		description: 'Cria detalhes de entrega para uma viagem',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Post()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	create(@Body(ValidationPipe) dto: CreateDeliveryDetailsDto) {
		return this.deliveryDetailsService.create(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter detalhes de entrega',
		description: 'Retorna os detalhes de entrega pelo ID',
	})
	@UseGuards(JwtAuthGuard)
	@Get(':id')
	findById(@Param('id') id: string) {
		return this.deliveryDetailsService.findById(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter detalhes por viagem',
		description: 'Retorna os detalhes de entrega associados a uma viagem',
	})
	@UseGuards(JwtAuthGuard)
	@Get('trip/:tripId')
	findByTripId(@Param('tripId') tripId: string) {
		return this.deliveryDetailsService.findByTripId(tripId);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar detalhes de entrega',
		description: 'Atualiza os detalhes de entrega',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Patch(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	update(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateDeliveryDetailsDto,
	) {
		return this.deliveryDetailsService.update(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover detalhes de entrega',
		description: 'Remove os detalhes de entrega',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Delete(':id')
	@Roles(UserRole.SUPER_ADMIN)
	remove(@Param('id') id: string) {
		return this.deliveryDetailsService.remove(id);
	}
}
