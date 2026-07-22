import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripAssignmentStatus } from '@prisma/client';

export class UpdateTripAssignmentDto {
	@ApiProperty({
		enum: TripAssignmentStatus,
		description: 'Novo estado da atribuição',
	})
	@IsEnum(TripAssignmentStatus)
	status!: TripAssignmentStatus;

	@ApiPropertyOptional({
		description: 'Motivo da rejeição (opcional, apenas para REJECTED)',
	})
	@IsOptional()
	@IsString()
	rejectReason?: string;
}
