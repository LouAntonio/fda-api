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
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { ListTripsDto } from './dto/list-trips.dto';
import { UpdateTripStatusDto } from './dto/update-trip-status.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { EstimateTripDto } from './dto/estimate-trip.dto';
import { TripStatsDto } from './dto/trip-stats.dto';

@ApiTags('Viagens')
@Controller('trips')
export class TripsController {
	constructor(private tripsService: TripsService) {}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Criar viagem',
		description:
			'Cria uma nova viagem com cálculo de preço. CLIENT cria para si próprio; admins podem especificar clientId',
	})
	@UseGuards(JwtAuthGuard)
	@Post()
	create(@Body(ValidationPipe) dto: CreateTripDto, @Req() req: Request) {
		const user = req.user as { id: string; role: UserRole };
		return this.tripsService.create(dto, user.id, user.role);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar viagens',
		description:
			'Lista viagens com paginação e filtros. CLIENT/DRIVER vê apenas as suas.',
	})
	@UseGuards(JwtAuthGuard)
	@Get()
	list(@Query(ValidationPipe) dto: ListTripsDto, @Req() req: Request) {
		const user = req.user as { id: string; role: UserRole };
		return this.tripsService.list(dto, user.id, user.role);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Estatísticas de viagens',
		description: 'Retorna estatísticas de viagens num período',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Get('stats')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.FINANCE)
	getStats(@Query(ValidationPipe) dto: TripStatsDto) {
		return this.tripsService.getStats(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Calcular estimativa',
		description: 'Calcula o preço estimado de uma viagem sem a criar',
	})
	@UseGuards(JwtAuthGuard)
	@Post('estimate')
	estimate(@Body(ValidationPipe) dto: EstimateTripDto) {
		return this.tripsService.estimate(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter viagem',
		description: 'Retorna os detalhes de uma viagem específica',
	})
	@UseGuards(JwtAuthGuard)
	@Get(':id')
	findById(@Param('id') id: string, @Req() req: Request) {
		const user = req.user as { id: string; role: UserRole };
		return this.tripsService.findById(id, user.id, user.role);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar viagem',
		description:
			'Atualiza dados de uma viagem (SUPER_ADMIN, OPERATIONS, SUPPORT)',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Patch(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	update(@Param('id') id: string, @Body(ValidationPipe) dto: UpdateTripDto) {
		return this.tripsService.update(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover viagem',
		description: 'Remove (soft delete) uma viagem (apenas SUPER_ADMIN)',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Delete(':id')
	@Roles(UserRole.SUPER_ADMIN)
	remove(@Param('id') id: string) {
		return this.tripsService.remove(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar estado da viagem',
		description:
			'Avança o estado da viagem (DRIVER, SUPER_ADMIN, OPERATIONS)',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Patch(':id/status')
	@Roles(
		UserRole.DRIVER,
		UserRole.SUPER_ADMIN,
		UserRole.OPERATIONS,
		UserRole.SUPPORT,
	)
	updateStatus(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateTripStatusDto,
		@Req() req: Request,
	) {
		const user = req.user as { id: string; role: UserRole };
		return this.tripsService.updateStatus(id, dto, user.id, user.role);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Cancelar viagem',
		description:
			'Cancela uma viagem. CLIENT/DRIVER cancela a sua própria; admins cancelam qualquer.',
	})
	@UseGuards(JwtAuthGuard)
	@Post(':id/cancel')
	cancel(
		@Param('id') id: string,
		@Body('cancelReason') cancelReason: string,
		@Req() req: Request,
	) {
		const user = req.user as { id: string; role: UserRole };
		return this.tripsService.cancel(id, cancelReason, user.id, user.role);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar pagamento',
		description: 'Atualiza o estado de pagamento de uma viagem',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Patch(':id/payment')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.FINANCE)
	updatePayment(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdatePaymentStatusDto,
	) {
		return this.tripsService.updatePayment(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Eventos da viagem',
		description: 'Retorna o histórico de eventos de uma viagem',
	})
	@UseGuards(JwtAuthGuard)
	@Get(':id/events')
	getEvents(@Param('id') id: string, @Req() req: Request) {
		const user = req.user as { id: string; role: UserRole };
		return this.tripsService.getEvents(id, user.id, user.role);
	}
}
