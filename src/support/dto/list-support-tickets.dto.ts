import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum SupportTicketStatus {
	OPEN = 'OPEN',
	IN_PROGRESS = 'IN_PROGRESS',
	RESOLVED = 'RESOLVED',
}

export class ListSupportTicketsDto {
	@ApiPropertyOptional({ enum: SupportTicketStatus })
	@IsOptional()
	@IsEnum(SupportTicketStatus)
	status?: SupportTicketStatus;

	@ApiPropertyOptional({ example: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number = 1;

	@ApiPropertyOptional({ example: 20 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	limit?: number = 20;
}
