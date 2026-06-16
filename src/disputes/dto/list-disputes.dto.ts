import {
	IsOptional,
	IsString,
	IsInt,
	Min,
	Max,
	IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListDisputesDto {
	@ApiPropertyOptional({ example: 1, description: 'Número da página' })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number;

	@ApiPropertyOptional({
		example: 20,
		description: 'Limite de resultados por página',
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number;

	@ApiPropertyOptional({ description: 'Filtrar por viagem (ID)' })
	@IsOptional()
	@IsString()
	tripId?: string;

	@ApiPropertyOptional({ description: 'Filtrar por utilizador (ID)' })
	@IsOptional()
	@IsString()
	openedByUserId?: string;

	@ApiPropertyOptional({
		description: 'Apenas resolvidas (true) / não resolvidas (false)',
	})
	@IsOptional()
	@Type(() => Boolean)
	@IsBoolean()
	isResolved?: boolean;

	@ApiPropertyOptional({
		description: 'Incluir registos deletados',
	})
	@IsOptional()
	@Type(() => Boolean)
	@IsBoolean()
	includeDeleted?: boolean;

	@ApiPropertyOptional({
		enum: ['createdAt', 'updatedAt', 'resolvedAt'],
		description: 'Campo para ordenar',
	})
	@IsOptional()
	@IsString()
	sortBy?: 'createdAt' | 'updatedAt' | 'resolvedAt';

	@ApiPropertyOptional({
		enum: ['asc', 'desc'],
		description: 'Direção da ordenação',
	})
	@IsOptional()
	@IsString()
	sortOrder?: 'asc' | 'desc';
}
