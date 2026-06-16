import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
	@ApiProperty({
		example: '+244 900 000 000',
		description: 'Número de telefone do utilizador',
	})
	@IsString()
	@MinLength(1)
	phoneNumber!: string;

	@ApiProperty({ example: 'strongPass123', description: 'Palavra-passe' })
	@IsString()
	password!: string;
}
