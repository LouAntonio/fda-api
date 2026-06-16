import {
	IsString,
	IsOptional,
	IsEnum,
	IsNumber,
	ValidateNested,
	IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceType, PaymentMethod } from '@prisma/client';

export class CoordsDto {
	@ApiProperty({ example: -8.6489, description: 'Latitude' })
	@IsNumber()
	lat!: number;

	@ApiProperty({ example: 41.1409, description: 'Longitude' })
	@IsNumber()
	lng!: number;
}

export class DeliveryDetailsDto {
	@ApiProperty({ example: 'João Silva', description: 'Nome do recetor' })
	@IsString()
	receiverName!: string;

	@ApiProperty({
		example: '+244 900 000 000',
		description: 'Telefone do recetor',
	})
	@IsString()
	receiverPhone!: string;

	@ApiProperty({
		example: 'documentos',
		description: 'Tipo de encomenda',
	})
	@IsString()
	packageType!: string;

	@ApiPropertyOptional({
		example: 'Deixar com porteiro',
		description: 'Observações',
	})
	@IsOptional()
	@IsString()
	notes?: string;
}

export class CreateTripDto {
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
		example: 'Rua A, nº 123',
		description: 'Endereço de recolha',
	})
	@IsString()
	pickupAddress!: string;

	@ApiPropertyOptional({
		example: 'Ao lado do mercado',
		description: 'Ponto de referência da recolha',
	})
	@IsOptional()
	@IsString()
	pickupReference?: string;

	@ApiProperty({
		example: 'Rua B, nº 456',
		description: 'Endereço de destino',
	})
	@IsString()
	dropoffAddress!: string;

	@ApiPropertyOptional({
		example: 'Prédio azul, 3º andar',
		description: 'Ponto de referência do destino',
	})
	@IsOptional()
	@IsString()
	dropoffReference?: string;

	@ApiProperty({
		enum: PaymentMethod,
		description: 'Método de pagamento',
	})
	@IsEnum(PaymentMethod)
	paymentMethod!: PaymentMethod;

	@ApiPropertyOptional({
		example: 'PROMO10',
		description: 'Código de cupão de desconto',
	})
	@IsOptional()
	@IsString()
	couponCode?: string;

	@ApiPropertyOptional({
		description: 'Detalhes da entrega (obrigatório para DELIVERY)',
		type: DeliveryDetailsDto,
	})
	@IsOptional()
	@ValidateNested()
	@Type(() => DeliveryDetailsDto)
	@IsObject()
	deliveryDetails?: DeliveryDetailsDto;
}
