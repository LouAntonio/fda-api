import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
	@ApiProperty({
		example: 'strongPass123',
		description: 'Palavra-passe (mín. 8 caracteres)',
	})
	@IsString()
	@MinLength(8)
	password!: string;

	@ApiProperty({
		example: 'João',
		description: 'Nome do utilizador',
	})
	@IsString()
	@MinLength(1)
	name!: string;

	@ApiProperty({
		example: 'Silva',
		description: 'Apelido do utilizador',
	})
	@IsString()
	@MinLength(1)
	surname!: string;

	@ApiProperty({
		example: '+244 900 000 000',
		description: 'Número de telefone do utilizador',
	})
	@IsString()
	@MinLength(1)
	phoneNumber!: string;
}
