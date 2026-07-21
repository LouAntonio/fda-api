import {
	IsOptional,
	IsString,
	IsNumber,
	ValidateNested,
	IsObject,
	Min,
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

	@ApiPropertyOptional({
		description: 'Coordenadas reais de recolha (preenchidas na conclusão)',
		type: CoordsDto,
	})
	@IsOptional()
	@ValidateNested()
	@Type(() => CoordsDto)
	@IsObject()
	actualPickupCoords?: CoordsDto;

	@ApiPropertyOptional({
		description: 'Coordenadas reais de destino (preenchidas na conclusão)',
		type: CoordsDto,
	})
	@IsOptional()
	@ValidateNested()
	@Type(() => CoordsDto)
	@IsObject()
	actualDropoffCoords?: CoordsDto;

	@ApiPropertyOptional({
		description: 'Coordenadas de onde o pedido foi feito',
		type: CoordsDto,
	})
	@IsOptional()
	@ValidateNested()
	@Type(() => CoordsDto)
	@IsObject()
	requestLocation?: CoordsDto;

	@ApiPropertyOptional({
		example: 500.0,
		description: 'Troco para pagamento em dinheiro',
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	changeFor?: number;

	@ApiPropertyOptional({
		example: 'uuid-do-endereco',
		description: 'ID do endereço de recolha salvo do utilizador',
	})
	@IsOptional()
	@IsString()
	pickupUserAddressId?: string;

	@ApiPropertyOptional({
		example: 'uuid-do-endereco',
		description: 'ID do endereço de destino salvo do utilizador',
	})
	@IsOptional()
	@IsString()
	dropoffUserAddressId?: string;
}
