import { IsString, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeEmailDto {
	@ApiProperty({
		example: 'novo@email.com',
		description: 'Novo email do utilizador',
	})
	@IsString()
	@IsEmail()
	newEmail!: string;

	@ApiProperty({
		example: 'minhaSenha123',
		description: 'Palavra-passe atual para confirmar a alteração',
	})
	@IsString()
	@MinLength(1)
	password!: string;
}
