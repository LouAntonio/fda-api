import {
	IsOptional,
	IsString,
	IsInt,
	Min,
	Max,
	IsEnum,
	IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TripEventType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListTripEventsDto {
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

	@ApiPropertyOptional({ description: 'Filtrar por viagem (ID)' })
	@IsOptional()
	@IsString()
	tripId?: string;

	@ApiPropertyOptional({
		enum: TripEventType,
		description: 'Filtrar por tipo de evento',
	})
	@IsOptional()
	@IsEnum(TripEventType)
	type?: TripEventType;

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
		enum: ['createdAt', 'type'],
		description: 'Campo para ordenar',
	})
	@IsOptional()
	@IsString()
	sortBy?: 'createdAt' | 'type';

	@ApiPropertyOptional({
		enum: ['asc', 'desc'],
		description: 'Direção da ordenação',
	})
	@IsOptional()
	@IsString()
	sortOrder?: 'asc' | 'desc';
}
