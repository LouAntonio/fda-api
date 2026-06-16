import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AddressLabel } from '@prisma/client';

export class UpdateAddressDto {
	@ApiPropertyOptional({
		enum: AddressLabel,
		description: 'Tipo de endereço',
	})
	@IsOptional()
	@IsEnum(AddressLabel)
	label?: AddressLabel;

	@ApiPropertyOptional({
		example: 'Casa da avó',
		description: 'Nome personalizado',
	})
	@IsOptional()
	@IsString()
	customLabel?: string;

	@ApiPropertyOptional({
		example: 'Rua 10, Casa 20, Bairro Alvalade',
		description: 'Endereço',
	})
	@IsOptional()
	@IsString()
	address?: string;

	@ApiPropertyOptional({
		example: 'Perto do mercado',
		description: 'Ponto de referência',
	})
	@IsOptional()
	@IsString()
	reference?: string;

	@ApiPropertyOptional({ example: -8.8383, description: 'Latitude' })
	@IsOptional()
	@IsNumber()
	lat?: number;

	@ApiPropertyOptional({ example: 13.2344, description: 'Longitude' })
	@IsOptional()
	@IsNumber()
	lng?: number;
}
