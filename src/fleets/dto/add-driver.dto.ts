import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddDriverDto {
	@ApiProperty({
		example: 'uuid-do-driver',
		description: 'ID do motorista a adicionar à frota',
	})
	@IsString()
	driverId!: string;
}
