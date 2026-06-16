import {
	IsString,
	IsOptional,
	IsEmail,
	MinLength,
	MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
	@ApiPropertyOptional({ example: 'João', description: 'Nome do utilizador' })
	@IsOptional()
	@IsString()
	@MinLength(1)
	@MaxLength(100)
	name?: string;

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

	@ApiPropertyOptional({
		example: '+244 923 456 789',
		description: 'Número de telefone',
	})
	@IsOptional()
	@IsString()
	phoneNumber?: string;

	@ApiPropertyOptional({
		example: 'https://res.cloudinary.com/...',
		description: 'URL do avatar (Cloudinary)',
	})
	@IsOptional()
	@IsString()
	image?: string;

	@ApiPropertyOptional({
		example: 'Maria',
		description: 'Nome do contacto de emergência',
	})
	@IsOptional()
	@IsString()
	emergencyContactName?: string;

	@ApiPropertyOptional({
		example: '+244 900 000 001',
		description: 'Telefone do contacto de emergência',
	})
	@IsOptional()
	@IsString()
	emergencyContactPhone?: string;

	@ApiPropertyOptional({
		example: 'abc123-device',
		description: 'ID do dispositivo',
	})
	@IsOptional()
	@IsString()
	deviceId?: string;
}
