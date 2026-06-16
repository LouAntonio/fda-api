import {
	IsString,
	IsOptional,
	IsEmail,
	MinLength,
	IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
	@ApiProperty({ example: 'João', description: 'Nome do utilizador' })
	@IsString()
	@MinLength(1)
	name!: string;

	@ApiPropertyOptional({
		example: 'Silva',
		description: 'Apelido do utilizador',
	})
	@IsOptional()
	@IsString()
	surname?: string;

	@ApiPropertyOptional({
		example: 'joao@email.com',
		description: 'Email do utilizador',
	})
	@IsOptional()
	@IsEmail()
	email?: string;

	@ApiProperty({
		example: '+244 900 000 000',
		description: 'Número de telefone',
	})
	@IsString()
	@MinLength(1)
	phoneNumber!: string;

	@ApiProperty({
		example: 'strongPass123',
		description: 'Palavra-passe inicial',
	})
	@IsString()
	@MinLength(8)
	password!: string;

	@ApiPropertyOptional({ enum: UserRole, description: 'Cargo do utilizador' })
	@IsOptional()
	@IsEnum(UserRole)
	role?: UserRole;
}
