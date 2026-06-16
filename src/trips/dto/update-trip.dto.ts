import {
	IsOptional,
	IsString,
	IsNumber,
	ValidateNested,
	IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CoordsDto } from './create-trip.dto';

export class UpdateTripDto {
	@ApiPropertyOptional({
		description: 'Coordenadas de recolha',
		type: CoordsDto,
	})
	@IsOptional()
	@ValidateNested()
	@Type(() => CoordsDto)
	@IsObject()
	pickupCoords?: CoordsDto;

	@ApiPropertyOptional({
		description: 'Coordenadas de destino',
		type: CoordsDto,
	})
	@IsOptional()
	@ValidateNested()
	@Type(() => CoordsDto)
	@IsObject()
	dropoffCoords?: CoordsDto;

	@ApiPropertyOptional({ example: 'Rua A, nº 123' })
	@IsOptional()
	@IsString()
	pickupAddress?: string;

	@ApiPropertyOptional({ example: 'Ao lado do mercado' })
	@IsOptional()
	@IsString()
	pickupReference?: string;

	@ApiPropertyOptional({ example: 'Rua B, nº 456' })
	@IsOptional()
	@IsString()
	dropoffAddress?: string;

	@ApiPropertyOptional({ example: 'Prédio azul, 3º andar' })
	@IsOptional()
	@IsString()
	dropoffReference?: string;

	@ApiPropertyOptional({ example: 5.3, description: 'Distância real (km)' })
	@IsOptional()
	@IsNumber()
	actualDistanceKm?: number;

	@ApiPropertyOptional({
		example: 25,
		description: 'Duração real (minutos)',
	})
	@IsOptional()
	@IsNumber()
	actualDurationMin?: number;
}
