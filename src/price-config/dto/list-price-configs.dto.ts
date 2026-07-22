import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleType, ServiceType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListPriceConfigsDto {
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

	@ApiPropertyOptional({
		enum: VehicleType,
		description: 'Filtrar por tipo de veículo',
	})
	@IsOptional()
	@IsEnum(VehicleType)
	vehicleType?: VehicleType;

	@ApiPropertyOptional({
		enum: ServiceType,
		description: 'Filtrar por tipo de serviço',
	})
	@IsOptional()
	@IsEnum(ServiceType)
	serviceType?: ServiceType;

	@ApiPropertyOptional({ description: 'Filtrar por ativo/inativo' })
	@IsOptional()
	@Type(() => Boolean)
	isActive?: boolean;

	@ApiPropertyOptional({
		enum: ['vehicleType', 'serviceType', 'baseFare', 'createdAt'],
		description: 'Campo para ordenar',
	})
	@IsOptional()
	@IsString()
	sortBy?: 'vehicleType' | 'serviceType' | 'baseFare' | 'createdAt';

	@ApiPropertyOptional({
		enum: ['asc', 'desc'],
		description: 'Direção da ordenação',
	})
	@IsOptional()
	@IsString()
	sortOrder?: 'asc' | 'desc';
}
