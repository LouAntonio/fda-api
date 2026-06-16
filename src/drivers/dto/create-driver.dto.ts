import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDriverDto {
	@ApiProperty({
		example: 'uuid-do-user',
		description: 'ID do utilizador a vincular como motorista',
	})
	@IsString()
	userId!: string;

	@ApiProperty({
		example: '123456789LA',
		description: 'Número do Bilhete de Identidade',
	})
	@IsString()
	@MinLength(5)
	@MaxLength(20)
	biNumber!: string;

	@ApiProperty({
		example: 'ANG2025LIC001',
		description: 'Número da carta de condução',
	})
	@IsString()
	@MinLength(5)
	@MaxLength(20)
	licenseNumber!: string;
}
