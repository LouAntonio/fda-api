import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
	@ApiProperty({ description: 'Access token do Google OAuth' })
	@IsString()
	accessToken!: string;
}
