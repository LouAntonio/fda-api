import {
	IsOptional,
	IsString,
	IsInt,
	Min,
	Max,
	IsEnum,
	IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleType, VehicleStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListVehiclesDto {
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

	@ApiPropertyOptional({ description: 'Pesquisa por matrícula' })
	@IsOptional()
	@IsString()
	search?: string;

	@ApiPropertyOptional({
		enum: VehicleStatus,
		description: 'Filtrar por estado',
	})
	@IsOptional()
	@IsEnum(VehicleStatus)
	status?: VehicleStatus;

	@ApiPropertyOptional({ enum: VehicleType, description: 'Filtrar por tipo' })
	@IsOptional()
	@IsEnum(VehicleType)
	type?: VehicleType;

	@ApiPropertyOptional({ description: 'Filtrar por motorista' })
	@IsOptional()
	@IsString()
	driverId?: string;

	@ApiPropertyOptional({ description: 'Incluir veículos deletados' })
	@IsOptional()
	@Type(() => Boolean)
	@IsBoolean()
	includeDeleted?: boolean;

	@ApiPropertyOptional({
		enum: ['createdAt', 'plateNumber', 'brand', 'year'],
		description: 'Campo para ordenar',
	})
	@IsOptional()
	@IsString()
	sortBy?: 'createdAt' | 'plateNumber' | 'brand' | 'year';

	@ApiPropertyOptional({
		enum: ['asc', 'desc'],
		description: 'Direção da ordenação',
	})
	@IsOptional()
	@IsString()
	sortOrder?: 'asc' | 'desc';
}
