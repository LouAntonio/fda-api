import { IsString, IsNumber, Min, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateCouponDto {
	@ApiProperty({ example: 'PROMO10', description: 'Código do cupão' })
	@IsString()
	@MinLength(1)
	code!: string;

	@ApiProperty({ example: 1500, description: 'Valor da viagem em Kz' })
	@IsNumber()
	@Min(0)
	tripAmount!: number;

	@ApiProperty({ example: 'uuid-user-id', description: 'ID do utilizador' })
	@IsString()
	@MinLength(1)
	userId!: string;
}
