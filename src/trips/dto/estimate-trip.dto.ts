import { IsEnum, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ServiceType, VehicleType } from '@prisma/client';
import { CoordsDto } from './create-trip.dto';

export class EstimateTripDto {
	@ApiProperty({
		enum: ServiceType,
		description: 'Tipo de serviço (RIDE ou DELIVERY)',
	})
	@IsEnum(ServiceType)
	serviceType!: ServiceType;

	@ApiProperty({
		description: 'Coordenadas de recolha',
		type: CoordsDto,
	})
	@ValidateNested()
	@Type(() => CoordsDto)
	@IsObject()
	pickupCoords!: CoordsDto;

	@ApiProperty({
		description: 'Coordenadas de destino',
		type: CoordsDto,
	})
	@ValidateNested()
	@Type(() => CoordsDto)
	@IsObject()
	dropoffCoords!: CoordsDto;

	@ApiProperty({
		enum: VehicleType,
		description: 'Tipo de veículo para calcular o preço',
	})
	@IsEnum(VehicleType)
	vehicleType!: VehicleType;
}
