import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TripStatsDto {
	@ApiProperty({
		description: 'Data início - ISO 8601',
	})
	@IsDateString()
	dateFrom!: string;

	@ApiProperty({
		description: 'Data fim - ISO 8601',
	})
	@IsDateString()
	dateTo!: string;

	@ApiPropertyOptional({
		enum: ['day', 'week', 'month'],
		description: 'Agrupar por período',
	})
	@IsOptional()
	@IsEnum(['day', 'week', 'month'] as const)
	groupBy?: 'day' | 'week' | 'month';
}
