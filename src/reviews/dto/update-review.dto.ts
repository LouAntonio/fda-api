import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateReviewDto {
	@ApiPropertyOptional({
		example: 4,
		description: 'Classificação (1-5)',
	})
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(5)
	rating?: number;

	@ApiPropertyOptional({
		example: 'Bom serviço, mas houve atraso',
		description: 'Comentário',
	})
	@IsOptional()
	@IsString()
	comment?: string;
}
