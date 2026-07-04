import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';

@Injectable()
export class SupportService {
	constructor(
		private prisma: PrismaService,
		private logger: LoggerService,
	) {}

	async create(userId: string | undefined, dto: CreateSupportTicketDto) {
		const ticket = await this.prisma.client.supportTicket.create({
			data: {
				id: uuidv7(),
				userId: userId ?? null,
				name: dto.name,
				email: dto.email ?? null,
				phone: dto.phone ?? null,
				message: dto.message,
				status: 'OPEN',
			},
		});

		this.logger.log(
			`Support ticket created: ${ticket.id} from ${dto.name}`,
			'SupportService',
		);

		return {
			msg: 'Mensagem recebida com sucesso. Responderemos em breve.',
			data: { id: ticket.id },
		};
	}
}
