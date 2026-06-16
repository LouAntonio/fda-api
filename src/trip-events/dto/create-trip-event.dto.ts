import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripEventType } from '@prisma/client';

export class CreateTripEventDto {
	@ApiProperty({
		example: 'uuid-da-viagem',
		description: 'ID da viagem',
	})
	@IsString()
	tripId!: string;

	@ApiProperty({
		enum: TripEventType,
		description: 'Tipo de evento',
	})
	@IsEnum(TripEventType)
	type!: TripEventType;

	@ApiPropertyOptional({
		example: 'uuid-do-ator',
		description: 'ID do utilizador que realizou a ação',
	})
	@IsOptional()
	@IsString()
	actorUserId?: string;

	@ApiPropertyOptional({
		description: 'Metadados adicionais (JSON)',
	})
	@IsOptional()
	metadata?: Record<string, unknown>;
}
