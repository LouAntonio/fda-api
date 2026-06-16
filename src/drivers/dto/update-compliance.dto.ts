import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DriverComplianceStatus } from '@prisma/client';

export class UpdateComplianceDto {
	@ApiProperty({
		enum: [
			DriverComplianceStatus.APPROVED,
			DriverComplianceStatus.REJECTED,
			DriverComplianceStatus.SUSPENDED,
		],
		description: 'Novo estado de conformidade',
	})
	@IsEnum(DriverComplianceStatus)
	complianceStatus!: DriverComplianceStatus;

	@ApiPropertyOptional({
		example: 'Documentação insuficiente',
		description: 'Motivo (obrigatório se REJECTED ou SUSPENDED)',
	})
	@IsOptional()
	@IsString()
	motive?: string;
}
