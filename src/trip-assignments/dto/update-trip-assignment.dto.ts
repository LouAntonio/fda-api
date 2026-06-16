import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TripAssignmentStatus } from '@prisma/client';

export class UpdateTripAssignmentDto {
	@ApiProperty({
		enum: TripAssignmentStatus,
		description: 'Novo estado da atribuição',
	})
	@IsEnum(TripAssignmentStatus)
	status!: TripAssignmentStatus;
}
