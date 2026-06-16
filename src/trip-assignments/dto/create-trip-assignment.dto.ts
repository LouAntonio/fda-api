import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTripAssignmentDto {
	@ApiProperty({
		example: 'uuid-da-viagem',
		description: 'ID da viagem',
	})
	@IsString()
	tripId!: string;

	@ApiProperty({
		example: 'uuid-do-motorista',
		description: 'ID do motorista',
	})
	@IsString()
	driverId!: string;
}
