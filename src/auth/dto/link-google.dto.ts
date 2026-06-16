import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkGoogleDto {
	@ApiProperty({
		description: 'ID token do Google OAuth para vincular à conta',
	})
	@IsString()
	idToken!: string;
}
