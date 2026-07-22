import { IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType, ServiceType } from '@prisma/client';

export class CreatePriceConfigDto {
	@ApiProperty({
		enum: VehicleType,
		description: 'Tipo de veículo (MOTO ou CARRO)',
	})
	@IsEnum(VehicleType)
	vehicleType!: VehicleType;

	@ApiPropertyOptional({
		enum: ServiceType,
		description: 'Tipo de serviço (RIDE ou DELIVERY)',
		default: 'RIDE',
	})
	@IsOptional()
	@IsEnum(ServiceType)
	serviceType?: ServiceType;

	@ApiProperty({ example: 150, description: 'Taxa base (Kz)' })
	@IsNumber()
	@Min(0)
	baseFare!: number;

	@ApiProperty({ example: 100, description: 'Preço por km (Kz)' })
	@IsNumber()
	@Min(0)
	pricePerKm!: number;

	@ApiProperty({ example: 25, description: 'Preço por minuto (Kz)' })
	@IsNumber()
	@Min(0)
	pricePerMin!: number;

	@ApiProperty({ example: 300, description: 'Valor mínimo da corrida (Kz)' })
	@IsNumber()
	@Min(0)
	minFare!: number;

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

	@ApiPropertyOptional({ default: true, description: 'Ativo' })
	@IsOptional()
	isActive?: boolean;
}
