import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDeliveryDetailsDto {
	@ApiPropertyOptional({
		example: 'João Silva',
		description: 'Nome do recetor',
	})
	@IsOptional()
	@IsString()
	receiverName?: string;

	@ApiPropertyOptional({
		example: '+244 900 000 000',
		description: 'Telefone do recetor',
	})
	@IsOptional()
	@IsString()
	receiverPhone?: string;

	@ApiPropertyOptional({
		example: 'documentos',
		description: 'Tipo de encomenda',
	})
	@IsOptional()
	@IsString()
	packageType?: string;

	@ApiPropertyOptional({
		example: 'Deixar com porteiro',
		description: 'Observações',
	})
	@IsOptional()
	@IsString()
	notes?: string;

	@ApiPropertyOptional({
		description: 'Metadados adicionais (JSON)',
	})
	@IsOptional()
	metadata?: Record<string, unknown>;
}
