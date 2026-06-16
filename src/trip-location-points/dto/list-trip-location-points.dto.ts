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

export class ListTripLocationPointsDto {
	@ApiPropertyOptional({ example: 1, description: 'Número da página' })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number;

	@ApiPropertyOptional({
		example: 100,
		description: 'Limite de resultados por página',
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(500)
	limit?: number;

	@ApiPropertyOptional({ description: 'Filtrar por viagem (ID)' })
	@IsOptional()
	@IsString()
	tripId?: string;

	@ApiPropertyOptional({
		description: 'Data início (recolha) - ISO 8601',
	})
	@IsOptional()
	@IsDateString()
	dateFrom?: string;

	@ApiPropertyOptional({
		description: 'Data fim (recolha) - ISO 8601',
	})
	@IsOptional()
	@IsDateString()
	dateTo?: string;

	@ApiPropertyOptional({
		enum: ['recordedAt'],
		description: 'Campo para ordenar',
	})
	@IsOptional()
	@IsString()
	sortBy?: 'recordedAt';

	@ApiPropertyOptional({
		enum: ['asc', 'desc'],
		description: 'Direção da ordenação',
	})
	@IsOptional()
	@IsString()
	sortOrder?: 'asc' | 'desc';
}
