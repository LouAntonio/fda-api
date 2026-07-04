import { Body, Controller, Post, Req, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';

@ApiTags('Support')
@Controller('support')
export class SupportController {
	constructor(private supportService: SupportService) {}

	@ApiOperation({
		summary: 'Enviar mensagem de contacto',
		description:
			'Recebe uma mensagem do formulário de contacto/suporte (autenticado ou não)',
	})
	@Throttle({ default: { limit: 5, ttl: 60000 } })
	@Post('contact')
	create(
		@Body(ValidationPipe) dto: CreateSupportTicketDto,
		@Req() req: Request,
	) {
		const user = req.user as { id: string } | undefined;
		return this.supportService.create(user?.id, dto);
	}
}
