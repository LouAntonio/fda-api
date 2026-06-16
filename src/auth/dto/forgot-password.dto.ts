import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
	@ApiProperty({ example: 'user@email.com', description: 'Email da conta' })
	@IsEmail()
	email!: string;
}
