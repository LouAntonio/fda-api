import {
	IsString,
	IsOptional,
	IsEnum,
	IsNumber,
	IsInt,
	Min,
	MinLength,
	MaxLength,
	Matches,
	IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '@prisma/client';

export class CreateCouponDto {
	@ApiProperty({
		example: 'PROMO10',
		description:
			'Código do cupão (apenas letras maiúsculas, números e underscore)',
	})
	@IsString()
	@MinLength(3)
	@MaxLength(30)
	@Matches(/^[A-Z0-9_]+$/, {
		message:
			'O código deve conter apenas letras maiúsculas, números e underscore',
	})
	code!: string;

	@ApiPropertyOptional({
		example: '10% de desconto em viagens',
		description: 'Descrição do cupão',
	})
	@IsOptional()
	@IsString()
	description?: string;

	@ApiProperty({
		enum: DiscountType,
		description: 'Tipo de desconto (percentual ou valor fixo)',
	})
	@IsEnum(DiscountType)
	discountType!: DiscountType;

	@ApiProperty({ example: 10, description: 'Valor do desconto' })
	@IsNumber()
	@Min(0.01)
	discountValue!: number;

	@ApiPropertyOptional({
		example: 500,
		description: 'Desconto máximo (apenas para PERCENTAGE)',
	})
	@IsOptional()
	@IsNumber()
	@Min(0.01)
	maxDiscount?: number;

	@ApiPropertyOptional({
		example: 200,
		description: 'Valor mínimo da viagem para aplicar o cupão',
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	minTripAmount?: number;

	@ApiPropertyOptional({
		example: '2026-06-01T00:00:00.000Z',
		description: 'Início da validade',
	})
	@IsOptional()
	@IsDateString()
	startsAt?: string;

	@ApiPropertyOptional({
		example: '2026-12-31T23:59:59.000Z',
		description: 'Fim da validade',
	})
	@IsOptional()
	@IsDateString()
	expiresAt?: string;

	@ApiPropertyOptional({
		example: 100,
		description: 'Limite total de usos',
	})
	@IsOptional()
	@IsInt()
	@Min(1)
	usageLimit?: number;

	@ApiPropertyOptional({
		example: 1,
		description: 'Limite de usos por utilizador',
	})
	@IsOptional()
	@IsInt()
	@Min(1)
	limitPerUser?: number;
}
