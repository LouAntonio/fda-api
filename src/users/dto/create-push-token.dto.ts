import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePushTokenDto {
	@ApiProperty({
		example: 'ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
		description: 'Token de notificação push',
	})
	@IsString()
	token!: string;

	@ApiPropertyOptional({
		example: 'android',
		description: 'Tipo de dispositivo (ios, android, web)',
	})
	@IsOptional()
	@IsString()
	deviceType?: string;
}
