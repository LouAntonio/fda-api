import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DeleteAccountDto {
	@ApiPropertyOptional({
		example: 'minha-senha-secreta',
		description:
			'Palavra-passe atual (necessário se o utilizador tiver password definida)',
	})
	@IsString()
	@IsOptional()
	@MinLength(1)
	password?: string;
}
