import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmergencyContactDto {
	@ApiProperty({
		example: 'Maria',
		description: 'Nome do contacto de emergência',
	})
	@IsString()
	@MinLength(1)
	emergencyContactName!: string;

	@ApiProperty({
		example: '+244 900 000 001',
		description: 'Telefone do contacto de emergência',
	})
	@IsString()
	@MinLength(1)
	emergencyContactPhone!: string;
}
