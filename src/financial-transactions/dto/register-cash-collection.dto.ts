import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterCashCollectionDto {
	@ApiProperty({
		example: 'uuid-da-viagem',
		description: 'ID da viagem onde o cash foi recolhido',
	})
	@IsString()
	tripId!: string;

	@ApiProperty({
		example: 'uuid-do-motorista',
		description: 'ID do motorista que recolheu o cash',
	})
	@IsString()
	driverId!: string;

	@ApiPropertyOptional({
		example: 1500.0,
		description: 'Valor recolhido (default = totalPrice da viagem)',
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	amount?: number;

	@ApiPropertyOptional({
		example: 'Cash recolhido no destino',
		description: 'Observações sobre a recolha',
	})
	@IsOptional()
	@IsString()
	notes?: string;
}
