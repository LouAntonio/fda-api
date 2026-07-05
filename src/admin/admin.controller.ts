import {
	Controller,
	Get,
	Query,
	UseGuards,
	ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
	constructor(private adminService: AdminService) {}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Dashboard - cards de resumo',
		description:
			'Retorna métricas agregadas para exibição em cards do dashboard administrativo.',
	})
	@Get('dashboard')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	getDashboard() {
		return this.adminService.getDashboard();
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Estatísticas de viagens',
		description:
			'Agregação de viagens por período com filtros opcionais de tipo de serviço e método de pagamento.',
	})
	@Get('stats/trips')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.FINANCE)
	getTripStats(@Query(ValidationPipe) dto: DashboardQueryDto) {
		return this.adminService.getTripStats(
			dto.dateFrom,
			dto.dateTo,
			dto.groupBy,
		);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Estatísticas de motoristas',
		description:
			'Distribuição por status/disponibilidade, novos motoristas e top performers.',
	})
	@Get('stats/drivers')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	getDriverStats(@Query(ValidationPipe) dto: DashboardQueryDto) {
		return this.adminService.getDriverStats(dto.dateFrom, dto.dateTo);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Estatísticas de receita',
		description:
			'Receita total, breakdown por método de pagamento, taxas e earnings dos motoristas.',
	})
	@Get('stats/revenue')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.FINANCE)
	getRevenueStats(@Query(ValidationPipe) dto: DashboardQueryDto) {
		return this.adminService.getRevenueStats(
			dto.dateFrom,
			dto.dateTo,
			dto.groupBy,
		);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Estatísticas de utilizadores',
		description:
			'Crescimento de utilizadores, breakdown por role e verificação.',
	})
	@Get('stats/users')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	getUserStats(@Query(ValidationPipe) dto: DashboardQueryDto) {
		return this.adminService.getUserStats(dto.dateFrom, dto.dateTo);
	}
}
