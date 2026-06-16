import { IsString, IsOptional, IsNumber, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDriverPayoutDto {
	@ApiProperty({
		example: 'uuid-do-motorista',
		description: 'ID do motorista',
	})
	@IsString()
	driverId!: string;

	@ApiProperty({
		example: 25000.0,
		description: 'Valor do pagamento (Kz)',
	})
	@IsNumber()
	@Min(0)
	amount!: number;

	@ApiPropertyOptional({
		example: '2026-06-16T14:30:00.000Z',
		description: 'Data de processamento (default: now)',
	})
	@IsOptional()
	@IsDateString()
	processedAt?: string;

	@ApiPropertyOptional({
		example: 'TRF-987654',
		description: 'Referência da transferência',
	})
	@IsOptional()
	@IsString()
	reference?: string;
}
