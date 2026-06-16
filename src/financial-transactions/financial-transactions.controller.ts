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
import { FinancialTransactionsService } from './financial-transactions.service';
import { CreateFinancialTransactionDto } from './dto/create-financial-transaction.dto';
import { UpdateFinancialTransactionDto } from './dto/update-financial-transaction.dto';
import { ListFinancialTransactionsDto } from './dto/list-financial-transactions.dto';
import { UpdateFinancialTransactionStatusDto } from './dto/update-financial-transaction-status.dto';
import { RegisterCashCollectionDto } from './dto/register-cash-collection.dto';

@ApiTags('Transações Financeiras')
@Controller('financial-transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinancialTransactionsController {
	constructor(
		private financialTransactionsService: FinancialTransactionsService,
	) {}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Criar transação',
		description: 'Cria uma nova transação financeira',
	})
	@Post()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.FINANCE)
	create(@Body(ValidationPipe) dto: CreateFinancialTransactionDto) {
		return this.financialTransactionsService.create(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar transações',
		description:
			'Lista todas as transações financeiras com paginação e filtros',
	})
	@Get()
	@Roles(
		UserRole.SUPER_ADMIN,
		UserRole.OPERATIONS,
		UserRole.FINANCE,
		UserRole.SUPPORT,
	)
	list(@Query(ValidationPipe) dto: ListFinancialTransactionsDto) {
		return this.financialTransactionsService.list(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter transação',
		description: 'Retorna os dados de uma transação específica',
	})
	@Get(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.FINANCE)
	findById(@Param('id') id: string) {
		return this.financialTransactionsService.findById(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar transação',
		description: 'Atualiza os dados de uma transação',
	})
	@Patch(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.FINANCE)
	update(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateFinancialTransactionDto,
	) {
		return this.financialTransactionsService.update(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Alterar estado',
		description: 'Altera o estado de uma transação',
	})
	@Patch(':id/status')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.FINANCE)
	updateStatus(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateFinancialTransactionStatusDto,
	) {
		return this.financialTransactionsService.updateStatus(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover transação',
		description: 'Remove (soft delete) uma transação',
	})
	@Delete(':id')
	@Roles(UserRole.SUPER_ADMIN)
	remove(@Param('id') id: string) {
		return this.financialTransactionsService.remove(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Registar recolha de cash',
		description:
			'Regista a recolha de pagamento em cash pelo motorista. Atualiza a trip para PAID e cria uma transação CASH_COLLECTION.',
	})
	@Post('cash-collection')
	@Roles(UserRole.DRIVER, UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	registerCashCollection(
		@Body(ValidationPipe) dto: RegisterCashCollectionDto,
	) {
		return this.financialTransactionsService.registerCashCollection(dto);
	}
}
