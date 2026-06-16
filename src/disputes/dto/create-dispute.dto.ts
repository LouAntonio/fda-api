import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDisputeDto {
	@ApiProperty({
		example: 'uuid-da-viagem',
		description: 'ID da viagem',
	})
	@IsString()
	tripId!: string;

	@ApiProperty({
		example: 'Motorista não compareceu no destino correto',
		description: 'Motivo da disputa',
	})
	@IsString()
	reason!: string;

	@ApiPropertyOptional({
		example: 'O motorista parou a 2 quarteirões do destino',
		description: 'Descrição detalhada',
	})
	@IsOptional()
	@IsString()
	description?: string;
}
