import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SupportTicketStatus } from '@prisma/client';

export class UpdateSupportTicketDto {
	@ApiProperty({ enum: SupportTicketStatus })
	@IsEnum(SupportTicketStatus)
	status!: SupportTicketStatus;

	@ApiProperty({
		required: false,
		example: 'Ticket resolvido via contacto telefónico',
	})
	@IsOptional()
	@IsString()
	notes?: string;
}
