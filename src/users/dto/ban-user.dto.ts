import { IsString, IsOptional, IsDateString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BanUserDto {
	@ApiProperty({
		example: 'Comportamento inadequado',
		description: 'Motivo do banimento',
	})
	@IsString()
	@MinLength(3)
	motive!: string;

	@ApiPropertyOptional({
		example: '2026-12-31T23:59:59.000Z',
		description:
			'Data de fim do banimento (ISO 8601). Se vazio, banimento permanente',
	})
	@IsOptional()
	@IsDateString()
	bannedUntil?: string;
}
