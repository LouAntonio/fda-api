import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DriverAvailabilityStatus } from '@prisma/client';

export class UpdateAvailabilityDto {
	@ApiProperty({
		enum: DriverAvailabilityStatus,
		description: 'Novo estado de disponibilidade',
	})
	@IsEnum(DriverAvailabilityStatus)
	availability!: DriverAvailabilityStatus;
}
