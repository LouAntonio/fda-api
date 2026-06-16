import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
	FinancialTransactionType,
	FinancialTransactionStatus,
} from '@prisma/client';

export class UpdateFinancialTransactionDto {
	@ApiPropertyOptional({
		enum: FinancialTransactionType,
		description: 'Tipo de transação',
	})
	@IsOptional()
	@IsEnum(FinancialTransactionType)
	type?: FinancialTransactionType;

	@ApiPropertyOptional({ example: 1500.0, description: 'Valor (Kz)' })
	@IsOptional()
	@IsNumber()
	@Min(0)
	amount?: number;

	@ApiPropertyOptional({
		example: 'uuid-da-viagem',
		description: 'ID da viagem associada',
	})
	@IsOptional()
	@IsString()
	tripId?: string;

	@ApiPropertyOptional({
		example: 'uuid-do-cliente',
		description: 'ID do utilizador associado',
	})
	@IsOptional()
	@IsString()
	userId?: string;

	@ApiPropertyOptional({
		example: 'uuid-do-motorista',
		description: 'ID do motorista associado',
	})
	@IsOptional()
	@IsString()
	driverId?: string;

	@ApiPropertyOptional({
		enum: FinancialTransactionStatus,
		description: 'Estado da transação',
	})
	@IsOptional()
	@IsEnum(FinancialTransactionStatus)
	status?: FinancialTransactionStatus;

	@ApiPropertyOptional({
		example: 210.0,
		description: 'Valor do imposto (Kz)',
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	taxAmount?: number;

	@ApiPropertyOptional({
		example: 'AOA',
		description: 'Moeda',
	})
	@IsOptional()
	@IsString()
	currency?: string;

	@ApiPropertyOptional({
		example: 'Pagamento da viagem #123',
		description: 'Descrição da transação',
	})
	@IsOptional()
	@IsString()
	description?: string;

	@ApiPropertyOptional({
		example: 'TXN-123456',
		description: 'Referência externa',
	})
	@IsOptional()
	@IsString()
	externalReference?: string;

	@ApiPropertyOptional({
		description: 'Metadados adicionais (JSON)',
	})
	@IsOptional()
	metadata?: Record<string, unknown>;
}
