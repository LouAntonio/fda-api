import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditLogDto {
	@ApiProperty({
		example: 'uuid-do-admin',
		description: 'ID do administrador que realizou a ação',
	})
	@IsString()
	adminId!: string;

	@ApiProperty({
		example: 'UPDATE_TRIP_STATUS',
		description: 'Ação realizada',
	})
	@IsString()
	action!: string;

	@ApiProperty({
		example: 'Trip',
		description: 'Entidade afetada',
	})
	@IsString()
	entity!: string;

	@ApiProperty({
		example: 'uuid-da-entidade',
		description: 'ID da entidade afetada',
	})
	@IsString()
	entityId!: string;

	@ApiPropertyOptional({
		description: 'Valor anterior (JSON)',
	})
	@IsOptional()
	oldValue?: Record<string, unknown>;

	@ApiPropertyOptional({
		description: 'Novo valor (JSON)',
	})
	@IsOptional()
	newValue?: Record<string, unknown>;
}
