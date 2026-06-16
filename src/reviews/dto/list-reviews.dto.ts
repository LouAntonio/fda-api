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

export class ListReviewsDto {
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

	@ApiPropertyOptional({ description: 'Filtrar por avaliador (ID)' })
	@IsOptional()
	@IsString()
	fromUserId?: string;

	@ApiPropertyOptional({ description: 'Filtrar por avaliado (ID)' })
	@IsOptional()
	@IsString()
	toUserId?: string;

	@ApiPropertyOptional({
		example: 3,
		description: 'Classificação mínima',
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(5)
	ratingMin?: number;

	@ApiPropertyOptional({
		example: 5,
		description: 'Classificação máxima',
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(5)
	ratingMax?: number;

	@ApiPropertyOptional({
		description: 'Incluir registos deletados',
	})
	@IsOptional()
	@Type(() => Boolean)
	@IsBoolean()
	includeDeleted?: boolean;

	@ApiPropertyOptional({
		enum: ['createdAt', 'updatedAt', 'rating'],
		description: 'Campo para ordenar',
	})
	@IsOptional()
	@IsString()
	sortBy?: 'createdAt' | 'updatedAt' | 'rating';

	@ApiPropertyOptional({
		enum: ['asc', 'desc'],
		description: 'Direção da ordenação',
	})
	@IsOptional()
	@IsString()
	sortOrder?: 'asc' | 'desc';
}
