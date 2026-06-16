import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLocationDto {
	@ApiProperty({ example: -8.8383, description: 'Latitude' })
	@IsNumber()
	@Min(-90)
	@Max(90)
	lat!: number;

	@ApiProperty({ example: 13.2344, description: 'Longitude' })
	@IsNumber()
	@Min(-180)
	@Max(180)
	lng!: number;

	@ApiPropertyOptional({ example: 45.5, description: 'Direção (graus)' })
	@IsOptional()
	@IsNumber()
	heading?: number;

	@ApiPropertyOptional({ example: 60.0, description: 'Velocidade (km/h)' })
	@IsOptional()
	@IsNumber()
	@Min(0)
	speed?: number;

	@ApiPropertyOptional({
		example: 10.0,
		description: 'Precisão da localização (metros)',
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	accuracy?: number;
}
