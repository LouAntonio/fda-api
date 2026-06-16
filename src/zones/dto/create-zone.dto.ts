import {
	IsString,
	IsOptional,
	IsNumber,
	Min,
	IsArray,
	ArrayMinSize,
	MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateZoneDto {
	@ApiProperty({ example: 'Zona Central', description: 'Nome da zona' })
	@IsString()
	@MinLength(1)
	name!: string;

	@ApiProperty({
		example: [
			[-8.6489, 41.1409],
			[-8.6489, 41.1509],
			[-8.6389, 41.1509],
			[-8.6389, 41.1409],
			[-8.6489, 41.1409],
		],
		description:
			'Polígono do perímetro como array de coordenadas [lng, lat] (mínimo 4 pontos, último igual ao primeiro)',
	})
	@IsArray()
	@ArrayMinSize(4)
	boundary!: number[][];

	@ApiPropertyOptional({
		example: 1.5,
		description: 'Multiplicador de preço dinâmico (1.0 = preço normal)',
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	surgeMultiplier?: number;

	@ApiPropertyOptional({ default: true, description: 'Ativo' })
	@IsOptional()
	isActive?: boolean;
}
