import {
	IsOptional,
	IsString,
	IsInt,
	Min,
	Max,
	IsEnum,
	IsBoolean,
	IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListCouponsDto {
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

	@ApiPropertyOptional({ description: 'Pesquisa por código' })
	@IsOptional()
	@IsString()
	search?: string;

	@ApiPropertyOptional({ description: 'Filtrar por ativo/inativo' })
	@IsOptional()
	@Type(() => Boolean)
	@IsBoolean()
	isActive?: boolean;

	@ApiPropertyOptional({
		enum: DiscountType,
		description: 'Filtrar por tipo de desconto',
	})
	@IsOptional()
	@IsEnum(DiscountType)
	discountType?: DiscountType;

	@ApiPropertyOptional({ description: 'Data início (criação) - ISO 8601' })
	@IsOptional()
	@IsDateString()
	dateFrom?: string;

	@ApiPropertyOptional({ description: 'Data fim (criação) - ISO 8601' })
	@IsOptional()
	@IsDateString()
	dateTo?: string;

	@ApiPropertyOptional({
		description: 'Incluir cupões deletados (soft delete)',
	})
	@IsOptional()
	@Type(() => Boolean)
	@IsBoolean()
	includeDeleted?: boolean;

	@ApiPropertyOptional({
		enum: ['code', 'createdAt', 'discountValue', 'usageCount'],
		description: 'Campo para ordenar',
	})
	@IsOptional()
	@IsString()
	sortBy?: 'code' | 'createdAt' | 'discountValue' | 'usageCount';

	@ApiPropertyOptional({
		enum: ['asc', 'desc'],
		description: 'Direção da ordenação',
	})
	@IsOptional()
	@IsString()
	sortOrder?: 'asc' | 'desc';
}
