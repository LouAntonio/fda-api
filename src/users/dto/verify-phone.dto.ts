import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPhoneDto {
	@ApiProperty({
		example: '+244 900 000 000',
		description: 'Número de telefone a verificar',
	})
	@IsString()
	phoneNumber!: string;
}
