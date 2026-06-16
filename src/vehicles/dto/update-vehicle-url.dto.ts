import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVehicleUrlDto {
	@ApiProperty({
		example: 'https://res.cloudinary.com/.../file.jpg',
		description: 'URL do ficheiro no Cloudinary',
	})
	@IsString()
	url!: string;
}
