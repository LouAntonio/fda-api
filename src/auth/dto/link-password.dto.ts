import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkPasswordDto {
	@ApiProperty({
		example: 'newPass123',
		description: 'Nova palavra-passe (mín. 8 caracteres)',
	})
	@IsString()
	@MinLength(8)
	password!: string;
}
