import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDriverPayoutDto {
	@ApiPropertyOptional({
		example: '2026-06-16T14:30:00.000Z',
		description: 'Data de processamento',
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
