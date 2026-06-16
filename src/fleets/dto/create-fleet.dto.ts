import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFleetDto {
	@ApiProperty({
		example: 'uuid-do-user',
		description: 'ID do utilizador proprietário da frota',
	})
	@IsString()
	ownerId!: string;

	@ApiProperty({ example: 'Frota Central', description: 'Nome da frota' })
	@IsString()
	@MinLength(1)
	name!: string;
}
