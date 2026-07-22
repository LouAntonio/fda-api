import { IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType, ServiceType } from '@prisma/client';

export class UpdatePriceConfigDto {
	@ApiPropertyOptional({
		enum: VehicleType,
		description: 'Tipo de veículo (MOTO ou CARRO)',
	})
	@IsOptional()
	@IsEnum(VehicleType)
	vehicleType?: VehicleType;

	@ApiPropertyOptional({
		enum: ServiceType,
		description: 'Tipo de serviço (RIDE ou DELIVERY)',
	})
	@IsOptional()
	@IsEnum(ServiceType)
	serviceType?: ServiceType;

	@ApiPropertyOptional({ example: 150, description: 'Taxa base (Kz)' })
	@IsOptional()
	@IsNumber()
	@Min(0)
	baseFare?: number;

	@ApiPropertyOptional({ example: 100, description: 'Preço por km (Kz)' })
	@IsOptional()
	@IsNumber()
	@Min(0)
	pricePerKm?: number;

	@ApiPropertyOptional({ example: 25, description: 'Preço por minuto (Kz)' })
	@IsOptional()
	@IsNumber()
	@Min(0)
	pricePerMin?: number;

	@ApiPropertyOptional({
		example: 300,
		description: 'Valor mínimo da corrida (Kz)',
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	minFare?: number;

	@ApiPropertyOptional({
		example: 0.14,
		description: 'Taxa de IVA (0.14 = 14%)',
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	ivaRate?: number;

	@ApiPropertyOptional({
		example: 0.15,
		description: 'Taxa de serviço (0.15 = 15%)',
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	serviceFeeRate?: number;

	@ApiPropertyOptional({ description: 'Ativo' })
	@IsOptional()
	isActive?: boolean;
}
