import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';

export class UpdatePaymentStatusDto {
	@ApiProperty({
		enum: PaymentStatus,
		description: 'Novo estado do pagamento',
	})
	@IsEnum(PaymentStatus)
	paymentStatus!: PaymentStatus;

	@ApiPropertyOptional({
		example: 'TXN-123456',
		description: 'Referência externa da transação',
	})
	@IsOptional()
	@IsString()
	externalReference?: string;
}
