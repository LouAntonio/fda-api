import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
	@ApiProperty({
		example: 'uuid-da-viagem',
		description: 'ID da viagem',
	})
	@IsString()
	tripId!: string;

	@ApiProperty({
		example: 'uuid-do-avaliador',
		description: 'ID do utilizador que avalia',
	})
	@IsString()
	fromUserId!: string;

	@ApiProperty({
		example: 'uuid-do-avaliado',
		description: 'ID do utilizador a ser avaliado',
	})
	@IsString()
	toUserId!: string;

	@ApiProperty({
		example: 5,
		description: 'Classificação (1-5)',
	})
	@IsInt()
	@Min(1)
	@Max(5)
	rating!: number;

	@ApiPropertyOptional({
		example: 'Excelente serviço!',
		description: 'Comentário',
	})
	@IsOptional()
	@IsString()
	comment?: string;
}
