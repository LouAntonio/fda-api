import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
	@ApiProperty({
		description: 'Token de verificação de email (recebido por email)',
	})
	@IsString()
	token!: string;
}
