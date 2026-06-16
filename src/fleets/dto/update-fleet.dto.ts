import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFleetDto {
	@ApiPropertyOptional({
		example: 'Frota Central',
		description: 'Nome da frota',
	})
	@IsOptional()
	@IsString()
	@MinLength(1)
	name?: string;
}
