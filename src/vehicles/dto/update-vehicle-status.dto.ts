import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleStatus } from '@prisma/client';

export class UpdateVehicleStatusDto {
	@ApiProperty({
		enum: [
			VehicleStatus.ACTIVE,
			VehicleStatus.BLOCKED,
			VehicleStatus.MAINTENANCE,
		],
		description: 'Novo estado do veículo',
	})
	@IsEnum(VehicleStatus)
	status!: VehicleStatus;

	@ApiPropertyOptional({
		example: 'Documentação pendente',
		description: 'Motivo (opcional)',
	})
	@IsOptional()
	@IsString()
	motive?: string;
}
