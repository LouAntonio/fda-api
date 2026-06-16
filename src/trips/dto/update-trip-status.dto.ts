import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus } from '@prisma/client';

export class UpdateTripStatusDto {
	@ApiProperty({
		enum: TripStatus,
		description: 'Novo estado da viagem',
	})
	@IsEnum(TripStatus)
	status!: TripStatus;

	@ApiPropertyOptional({
		example: 'Motorista não compareceu',
		description:
			'Motivo do cancelamento (obrigatório se status = CANCELLED)',
	})
	@IsOptional()
	@IsString()
	cancelReason?: string;
}
