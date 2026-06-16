import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmPhoneDto {
	@ApiProperty({
		example: '123456',
		description: 'Código de verificação recebido',
	})
	@IsString()
	code!: string;
}
