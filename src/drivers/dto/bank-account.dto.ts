import {
	IsString,
	IsOptional,
	IsBoolean,
	MinLength,
	MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBankAccountDto {
	@ApiProperty({ description: 'Nome do banco' })
	@IsString()
	@MinLength(2)
	@MaxLength(100)
	bankName: string;

	@ApiProperty({ description: 'IBAN ou número de conta' })
	@IsString()
	@MinLength(5)
	@MaxLength(50)
	iban: string;

	@ApiProperty({ description: 'Titular da conta' })
	@IsString()
	@MinLength(2)
	@MaxLength(100)
	accountHolder: string;

	@ApiPropertyOptional({ description: 'Definir como padrão' })
	@IsOptional()
	@IsBoolean()
	isDefault?: boolean;
}

export class UpdateBankAccountDto {
	@ApiPropertyOptional({ description: 'Nome do banco' })
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(100)
	bankName?: string;

	@ApiPropertyOptional({ description: 'IBAN ou número de conta' })
	@IsOptional()
	@IsString()
	@MinLength(5)
	@MaxLength(50)
	iban?: string;

	@ApiPropertyOptional({ description: 'Titular da conta' })
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(100)
	accountHolder?: string;

	@ApiPropertyOptional({ description: 'Definir como padrão' })
	@IsOptional()
	@IsBoolean()
	isDefault?: boolean;
}
