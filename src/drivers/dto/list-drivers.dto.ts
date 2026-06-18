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
import {
	DriverComplianceStatus,
	DriverAvailabilityStatus,
} from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListDriversDto {
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
	@Max(500)
	limit?: number;

	@ApiPropertyOptional({ description: 'Pesquisa por nome, BI ou licença' })
	@IsOptional()
	@IsString()
	search?: string;

	@ApiPropertyOptional({
		enum: DriverComplianceStatus,
		description: 'Filtrar por estado de conformidade',
	})
	@IsOptional()
	@IsEnum(DriverComplianceStatus)
	complianceStatus?: DriverComplianceStatus;

	@ApiPropertyOptional({
		enum: DriverAvailabilityStatus,
		description: 'Filtrar por disponibilidade',
	})
	@IsOptional()
	@IsEnum(DriverAvailabilityStatus)
	availability?: DriverAvailabilityStatus;

	@ApiPropertyOptional({ description: 'Incluir motoristas deletados' })
	@IsOptional()
	@Type(() => Boolean)
	@IsBoolean()
	includeDeleted?: boolean;

	@ApiPropertyOptional({
		enum: ['createdAt', 'ratingAverage', 'completedTripsCount', 'biNumber'],
		description: 'Campo para ordenar',
	})
	@IsOptional()
	@IsString()
	sortBy?: 'createdAt' | 'ratingAverage' | 'completedTripsCount' | 'biNumber';

	@ApiPropertyOptional({
		enum: ['asc', 'desc'],
		description: 'Direção da ordenação',
	})
	@IsOptional()
	@IsString()
	sortOrder?: 'asc' | 'desc';
}
