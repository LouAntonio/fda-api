import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationDto {
	@ApiProperty({
		example: 'user@email.com',
		description: 'Email para reenviar verificação',
	})
	@IsEmail()
	email!: string;
}
