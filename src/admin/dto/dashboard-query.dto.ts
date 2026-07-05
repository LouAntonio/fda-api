import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardQueryDto {
	@ApiPropertyOptional({
		description: 'Data início - ISO 8601. Padrão: 30 dias atrás',
	})
	@IsOptional()
	@IsDateString()
	dateFrom?: string;

	@ApiPropertyOptional({
		description: 'Data fim - ISO 8601. Padrão: agora',
	})
	@IsOptional()
	@IsDateString()
	dateTo?: string;

	@ApiPropertyOptional({
		enum: ['day', 'week', 'month'],
		description: 'Agrupar por período. Padrão: day',
	})
	@IsOptional()
	@IsEnum(['day', 'week', 'month'] as const)
	groupBy?: 'day' | 'week' | 'month';
}
