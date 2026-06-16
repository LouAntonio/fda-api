import {
	IsString,
	IsOptional,
	IsEnum,
	IsNumber,
	MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddressLabel } from '@prisma/client';

export class CreateAddressDto {
	@ApiProperty({ enum: AddressLabel, description: 'Tipo de endereço' })
	@IsEnum(AddressLabel)
	label!: AddressLabel;

	@ApiPropertyOptional({
		example: 'Casa da avó',
		description: 'Nome personalizado',
	})
	@IsOptional()
	@IsString()
	customLabel?: string;

	@ApiProperty({
		example: 'Rua 10, Casa 20, Bairro Alvalade',
		description: 'Endereço',
	})
	@IsString()
	@MinLength(1)
	address!: string;

	@ApiPropertyOptional({
		example: 'Perto do mercado',
		description: 'Ponto de referência',
	})
	@IsOptional()
	@IsString()
	reference?: string;

	@ApiProperty({ example: -8.8383, description: 'Latitude' })
	@IsNumber()
	lat!: number;

	@ApiProperty({ example: 13.2344, description: 'Longitude' })
	@IsNumber()
	lng!: number;
}
