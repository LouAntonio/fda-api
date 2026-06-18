import {
	IsString,
	IsOptional,
	IsEnum,
	IsInt,
	IsUUID,
	Min,
	Max,
	MinLength,
	Matches,
	IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType } from '@prisma/client';

export class CreateVehicleDto {
	@ApiProperty({
		example: 'uuid-do-driver',
		description: 'ID do motorista proprietário',
	})
	@IsUUID()
	driverId!: string;

	@ApiProperty({
		example: 'AB-12-CD',
		description: 'Matrícula (formato: AA-99-AA)',
	})
	@IsString()
	@Matches(/^[A-Z]{2}-\d{2}-[A-Z]{2}$/, {
		message: 'Matrícula deve estar no formato AA-99-AA',
	})
	plateNumber!: string;

	@ApiProperty({ example: 'Toyota', description: 'Marca' })
	@IsString()
	@MinLength(1)
	brand!: string;

	@ApiProperty({ example: 'Corolla', description: 'Modelo' })
	@IsString()
	@MinLength(1)
	model!: string;

	@ApiPropertyOptional({ example: 2020, description: 'Ano de fabrico' })
	@IsOptional()
	@IsInt()
	@Min(1900)
	@Max(2030)
	year?: number;

	@ApiProperty({ example: 'Preto', description: 'Cor' })
	@IsString()
	@MinLength(1)
	color!: string;

	@ApiProperty({ enum: VehicleType, description: 'Tipo de veículo' })
	@IsEnum(VehicleType)
	type!: VehicleType;

	@ApiPropertyOptional({
		example: 'https://res.cloudinary.com/.../photo.jpg',
		description: 'URL da foto do veículo (Cloudinary)',
	})
	@IsOptional()
	@IsString()
	photoUrl?: string;

	@ApiPropertyOptional({
		example: 'https://res.cloudinary.com/.../doc.pdf',
		description: 'URL do documento do veículo (Cloudinary)',
	})
	@IsOptional()
	@IsString()
	documentUrl?: string;

	@ApiPropertyOptional({
		example: 'https://res.cloudinary.com/.../insurance.pdf',
		description: 'URL do seguro do veículo (Cloudinary)',
	})
	@IsOptional()
	@IsString()
	insuranceUrl?: string;

	@ApiPropertyOptional({
		example: '2026-12-31T23:59:59.000Z',
		description: 'Data de expiração da inspeção',
	})
	@IsOptional()
	@IsDateString()
	inspectionExpiresAt?: string;
}
