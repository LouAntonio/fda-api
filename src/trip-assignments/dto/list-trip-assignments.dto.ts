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
import { TripAssignmentStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListTripAssignmentsDto {
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

	@ApiPropertyOptional({ description: 'Filtrar por viagem (ID)' })
	@IsOptional()
	@IsString()
	tripId?: string;

	@ApiPropertyOptional({ description: 'Filtrar por motorista (ID)' })
	@IsOptional()
	@IsString()
	driverId?: string;

	@ApiPropertyOptional({
		enum: TripAssignmentStatus,
		description: 'Filtrar por estado',
	})
	@IsOptional()
	@IsEnum(TripAssignmentStatus)
	status?: TripAssignmentStatus;

	@ApiPropertyOptional({ description: 'Incluir registos deletados' })
	@IsOptional()
	@Type(() => Boolean)
	@IsBoolean()
	includeDeleted?: boolean;

	@ApiPropertyOptional({
		enum: ['createdAt', 'updatedAt', 'status'],
		description: 'Campo para ordenar',
	})
	@IsOptional()
	@IsString()
	sortBy?: 'createdAt' | 'updatedAt' | 'status';

	@ApiPropertyOptional({
		enum: ['asc', 'desc'],
		description: 'Direção da ordenação',
	})
	@IsOptional()
	@IsString()
	sortOrder?: 'asc' | 'desc';
}
