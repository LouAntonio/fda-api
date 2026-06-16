import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTripLocationPointDto {
	@ApiProperty({
		example: 'uuid-da-viagem',
		description: 'ID da viagem',
	})
	@IsString()
	tripId!: string;

	@ApiProperty({ example: -8.6489, description: 'Latitude' })
	@IsNumber()
	lat!: number;

	@ApiProperty({ example: 13.2903, description: 'Longitude' })
	@IsNumber()
	lng!: number;

	@ApiPropertyOptional({
		example: 45.5,
		description: 'Velocidade (km/h)',
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	speed?: number;

	@ApiPropertyOptional({
		example: 180.0,
		description: 'Direção (graus)',
	})
	@IsOptional()
	@IsNumber()
	heading?: number;

	@ApiPropertyOptional({
		example: '2026-06-16T14:30:00.000Z',
		description:
			'Momento da recolha (ISO 8601). Omite para usar o momento atual.',
	})
	@IsOptional()
	@IsString()
	recordedAt?: string;
}
