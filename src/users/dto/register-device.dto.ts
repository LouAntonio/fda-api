import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDeviceDto {
	@ApiProperty({ example: 'abc123-device', description: 'ID do dispositivo' })
	@IsString()
	deviceId!: string;
}
