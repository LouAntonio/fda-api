import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
	@ApiProperty({
		example: 'currentPass123',
		description: 'Palavra-passe atual',
	})
	@IsString()
	currentPassword!: string;

	@ApiProperty({
		example: 'newPass456',
		description: 'Nova palavra-passe (mín. 8 caracteres)',
	})
	@IsString()
	@MinLength(8)
	newPassword!: string;
}
