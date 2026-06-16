import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FinancialTransactionStatus } from '@prisma/client';

export class UpdateFinancialTransactionStatusDto {
	@ApiProperty({
		enum: FinancialTransactionStatus,
		description: 'Novo estado da transação',
	})
	@IsEnum(FinancialTransactionStatus)
	status!: FinancialTransactionStatus;
}
