import {
	IsString,
	IsOptional,
	IsNumber,
	Min,
	IsArray,
	ArrayMinSize,
	MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateZoneDto {
	@ApiPropertyOptional({
		example: 'Zona Central',
		description: 'Nome da zona',
	})
	@IsOptional()
	@IsString()
	@MinLength(1)
	name?: string;

	@ApiPropertyOptional({
		example: [
			[-8.6489, 41.1409],
			[-8.6489, 41.1509],
			[-8.6389, 41.1509],
			[-8.6389, 41.1409],
			[-8.6489, 41.1409],
		],
		description:
			'Polígono do perímetro como array de coordenadas [lng, lat] (mínimo 4 pontos)',
	})
	@IsOptional()
	@IsArray()
	@ArrayMinSize(4)
	boundary?: number[][];

	@ApiPropertyOptional({
		example: 1.5,
		description: 'Multiplicador de preço dinâmico',
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	surgeMultiplier?: number;

	@ApiPropertyOptional({ description: 'Ativo' })
	@IsOptional()
	isActive?: boolean;
}
