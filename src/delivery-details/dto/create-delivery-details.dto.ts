import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeliveryDetailsDto {
	@ApiProperty({
		example: 'uuid-da-viagem',
		description: 'ID da viagem (único)',
	})
	@IsString()
	tripId!: string;

	@ApiProperty({
		example: 'João Silva',
		description: 'Nome do recetor',
	})
	@IsString()
	receiverName!: string;

	@ApiProperty({
		example: '+244 900 000 000',
		description: 'Telefone do recetor',
	})
	@IsString()
	receiverPhone!: string;

	@ApiProperty({
		example: 'documentos',
		description: 'Tipo de encomenda',
	})
	@IsString()
	packageType!: string;

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
