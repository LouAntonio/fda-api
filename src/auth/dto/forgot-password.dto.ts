import { IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ForgotPasswordDto {
	@ApiPropertyOptional({
		example: 'user@email.com',
		description: 'Email da conta',
	})
	@IsOptional()
	@IsEmail()
	email?: string;

	@ApiPropertyOptional({
		example: '+244923456789',
		description: 'Número de telefone da conta',
	})
	@IsOptional()
	@IsString()
	phoneNumber?: string;
}
