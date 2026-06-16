import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
	@ApiPropertyOptional({
		example: 'João',
		description: 'Nome do utilizador',
	})
	@IsString()
	@IsOptional()
	@MinLength(1)
	@MaxLength(100)
	name?: string;

	@ApiPropertyOptional({
		example: 'Silva',
		description: 'Apelido do utilizador',
	})
	@IsString()
	@IsOptional()
	surname?: string;

	@ApiPropertyOptional({
		example: '+244 923 456 789',
		description: 'Número de telefone',
	})
	@IsString()
	@IsOptional()
	phoneNumber?: string;

	@ApiPropertyOptional({
		example: 'https://res.cloudinary.com/...',
		description: 'URL do avatar (Cloudinary)',
	})
	@IsString()
	@IsOptional()
	image?: string;
}
