import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus } from '@prisma/client';

export class UpdateDocumentStatusDto {
	@ApiProperty({
		enum: [DocumentStatus.APPROVED, DocumentStatus.REJECTED],
		description: 'Novo estado do documento',
	})
	@IsEnum(DocumentStatus)
	status!: DocumentStatus;

	@ApiPropertyOptional({
		example: 'Documento ilegível',
		description: 'Motivo da rejeição (obrigatório se REJECTED)',
	})
	@IsOptional()
	@IsString()
	rejectionReason?: string;
}
