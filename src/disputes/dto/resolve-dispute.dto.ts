import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveDisputeDto {
	@ApiProperty({
		example: 'Reembolso parcial de 50% aprovado',
		description: 'Resolução da disputa',
	})
	@IsString()
	resolution!: string;
}
