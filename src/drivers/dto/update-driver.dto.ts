import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDriverDto {
	@ApiPropertyOptional({
		example: '123456789LA',
		description: 'Número do Bilhete de Identidade',
	})
	@IsOptional()
	@IsString()
	@MinLength(5)
	@MaxLength(20)
	biNumber?: string;

	@ApiPropertyOptional({
		example: 'ANG2025LIC001',
		description: 'Número da carta de condução',
	})
	@IsOptional()
	@IsString()
	@MinLength(5)
	@MaxLength(20)
	licenseNumber?: string;

	@ApiPropertyOptional({
		example: 'uuid-do-veiculo',
		description: 'ID do veículo ativo',
	})
	@IsOptional()
	@IsString()
	activeVehicleId?: string;

	@ApiPropertyOptional({
		example: 'uuid-da-frota',
		description: 'ID da frota',
	})
	@IsOptional()
	@IsString()
	fleetId?: string;
}
