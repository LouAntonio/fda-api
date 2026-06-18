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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType } from '@prisma/client';

export class UpdateVehicleDto {
	@ApiPropertyOptional({
		example: 'uuid-do-driver',
		description: 'ID do motorista proprietário',
	})
	@IsOptional()
	@IsUUID()
	driverId?: string;

	@ApiPropertyOptional({ example: 'AB-12-CD', description: 'Matrícula' })
	@IsOptional()
	@IsString()
	@Matches(/^[A-Z]{2}-\d{2}-[A-Z]{2}$/, {
		message: 'Matrícula deve estar no formato AA-99-AA',
	})
	plateNumber?: string;

	@ApiPropertyOptional({ example: 'Toyota', description: 'Marca' })
	@IsOptional()
	@IsString()
	@MinLength(1)
	brand?: string;

	@ApiPropertyOptional({ example: 'Corolla', description: 'Modelo' })
	@IsOptional()
	@IsString()
	@MinLength(1)
	model?: string;

	@ApiPropertyOptional({ example: 2020, description: 'Ano de fabrico' })
	@IsOptional()
	@IsInt()
	@Min(1900)
	@Max(2030)
	year?: number;

	@ApiPropertyOptional({ example: 'Preto', description: 'Cor' })
	@IsOptional()
	@IsString()
	@MinLength(1)
	color?: string;

	@ApiPropertyOptional({ enum: VehicleType, description: 'Tipo de veículo' })
	@IsOptional()
	@IsEnum(VehicleType)
	type?: VehicleType;

	@ApiPropertyOptional({ description: 'URL da foto (Cloudinary)' })
	@IsOptional()
	@IsString()
	photoUrl?: string;

	@ApiPropertyOptional({ description: 'URL do documento (Cloudinary)' })
	@IsOptional()
	@IsString()
	documentUrl?: string;

	@ApiPropertyOptional({ description: 'URL do seguro (Cloudinary)' })
	@IsOptional()
	@IsString()
	insuranceUrl?: string;

	@ApiPropertyOptional({ description: 'Data de expiração da inspeção' })
	@IsOptional()
	@IsDateString()
	inspectionExpiresAt?: string;
}
