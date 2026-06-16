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
import { DriverPayoutsService } from './driver-payouts.service';
import { CreateDriverPayoutDto } from './dto/create-driver-payout.dto';
import { UpdateDriverPayoutDto } from './dto/update-driver-payout.dto';
import { ListDriverPayoutsDto } from './dto/list-driver-payouts.dto';

@ApiTags('Pagamentos a Motoristas')
@Controller('driver-payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriverPayoutsController {
	constructor(private driverPayoutsService: DriverPayoutsService) {}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Criar pagamento',
		description:
			'Regista um pagamento ao motorista. Atualiza o saldo disponível (availableBalance).',
	})
	@Post()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.FINANCE)
	create(@Body(ValidationPipe) dto: CreateDriverPayoutDto) {
		return this.driverPayoutsService.create(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar pagamentos',
		description: 'Lista pagamentos com paginação e filtros',
	})
	@Get()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.FINANCE)
	list(@Query(ValidationPipe) dto: ListDriverPayoutsDto) {
		return this.driverPayoutsService.list(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter pagamento',
		description: 'Retorna os dados de um pagamento específico',
	})
	@Get(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.FINANCE)
	findById(@Param('id') id: string) {
		return this.driverPayoutsService.findById(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar pagamento',
		description: 'Atualiza referência e/ou data de processamento',
	})
	@Patch(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE)
	update(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateDriverPayoutDto,
	) {
		return this.driverPayoutsService.update(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover pagamento',
		description: 'Remove (soft delete) um pagamento',
	})
	@Delete(':id')
	@Roles(UserRole.SUPER_ADMIN)
	remove(@Param('id') id: string) {
		return this.driverPayoutsService.remove(id);
	}
}
