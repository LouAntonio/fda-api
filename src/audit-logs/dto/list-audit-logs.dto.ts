import {
	IsOptional,
	IsString,
	IsInt,
	Min,
	Max,
	IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListAuditLogsDto {
	@ApiPropertyOptional({ example: 1, description: 'Número da página' })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number;

	@ApiPropertyOptional({
		example: 50,
		description: 'Limite de resultados por página',
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(200)
	limit?: number;

	@ApiPropertyOptional({
		description: 'Filtrar por entidade (ex: Trip, User)',
	})
	@IsOptional()
	@IsString()
	entity?: string;

	@ApiPropertyOptional({ description: 'Filtrar por ID da entidade' })
	@IsOptional()
	@IsString()
	entityId?: string;

	@ApiPropertyOptional({ description: 'Filtrar por administrador (ID)' })
	@IsOptional()
	@IsString()
	adminId?: string;

	@ApiPropertyOptional({
		description: 'Filtrar por ação (ex: UPDATE_TRIP_STATUS)',
	})
	@IsOptional()
	@IsString()
	action?: string;

	@ApiPropertyOptional({
		description: 'Data início - ISO 8601',
	})
	@IsOptional()
	@IsDateString()
	dateFrom?: string;

	@ApiPropertyOptional({
		description: 'Data fim - ISO 8601',
	})
	@IsOptional()
	@IsDateString()
	dateTo?: string;

	@ApiPropertyOptional({
		enum: ['asc', 'desc'],
		description: 'Direção da ordenação',
	})
	@IsOptional()
	@IsString()
	sortOrder?: 'asc' | 'desc';
}
