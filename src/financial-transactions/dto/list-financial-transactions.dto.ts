import {
	IsOptional,
	IsString,
	IsInt,
	Min,
	Max,
	IsEnum,
	IsBoolean,
	IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
	FinancialTransactionType,
	FinancialTransactionStatus,
} from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListFinancialTransactionsDto {
	@ApiPropertyOptional({ example: 1, description: 'Número da página' })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number;

	@ApiPropertyOptional({
		example: 20,
		description: 'Limite de resultados por página',
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number;

	@ApiPropertyOptional({
		description: 'Pesquisa por descrição',
	})
	@IsOptional()
	@IsString()
	search?: string;

	@ApiPropertyOptional({ description: 'Filtrar por viagem (ID)' })
	@IsOptional()
	@IsString()
	tripId?: string;

	@ApiPropertyOptional({ description: 'Filtrar por utilizador (ID)' })
	@IsOptional()
	@IsString()
	userId?: string;

	@ApiPropertyOptional({ description: 'Filtrar por motorista (ID)' })
	@IsOptional()
	@IsString()
	driverId?: string;

	@ApiPropertyOptional({
		enum: FinancialTransactionType,
		description: 'Filtrar por tipo',
	})
	@IsOptional()
	@IsEnum(FinancialTransactionType)
	type?: FinancialTransactionType;

	@ApiPropertyOptional({
		enum: FinancialTransactionStatus,
		description: 'Filtrar por estado',
	})
	@IsOptional()
	@IsEnum(FinancialTransactionStatus)
	status?: FinancialTransactionStatus;

	@ApiPropertyOptional({
		description: 'Incluir transações deletadas',
	})
	@IsOptional()
	@Type(() => Boolean)
	@IsBoolean()
	includeDeleted?: boolean;

	@ApiPropertyOptional({
		description: 'Data início (criação) - ISO 8601',
	})
	@IsOptional()
	@IsDateString()
	dateFrom?: string;

	@ApiPropertyOptional({
		description: 'Data fim (criação) - ISO 8601',
	})
	@IsOptional()
	@IsDateString()
	dateTo?: string;

	@ApiPropertyOptional({
		enum: ['createdAt', 'amount', 'type', 'status'],
		description: 'Campo para ordenar',
	})
	@IsOptional()
	@IsString()
	sortBy?: 'createdAt' | 'amount' | 'type' | 'status';

	@ApiPropertyOptional({
		enum: ['asc', 'desc'],
		description: 'Direção da ordenação',
	})
	@IsOptional()
	@IsString()
	sortOrder?: 'asc' | 'desc';
}
