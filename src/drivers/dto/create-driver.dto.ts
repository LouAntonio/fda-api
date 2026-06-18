import { Type } from 'class-transformer';
import {
	IsString,
	IsOptional,
	IsDateString,
	MinLength,
	MaxLength,
	ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DocumentInput {
	@ApiProperty({
		example: 'bi',
		description: 'Tipo de documento (ex: bi, carta, certidao, ...)',
	})
	@IsString()
	type!: string;

	@ApiProperty({
		example: 'https://res.cloudinary.com/.../documento.pdf',
		description: 'URL do ficheiro no Cloudinary',
	})
	@IsString()
	fileUrl!: string;

	@ApiPropertyOptional({
		example: '2027-06-16T23:59:59.000Z',
		description: 'Data de expiração do documento',
	})
	@IsOptional()
	@IsDateString()
	expiryDate?: string;
}

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

	@ApiPropertyOptional({
		description: 'Documentos de compliance para anexar ao motorista',
		type: [DocumentInput],
	})
	@IsOptional()
	@ValidateNested({ each: true })
	@Type(() => DocumentInput)
	documents?: DocumentInput[];
}
