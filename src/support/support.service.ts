import { Injectable, NotFoundException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { SupportTicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { ListSupportTicketsDto } from './dto/list-support-tickets.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';

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
				status: SupportTicketStatus.OPEN,
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

	async findAll(dto: ListSupportTicketsDto) {
		const where: Record<string, unknown> = {};
		if (dto.status) {
			where.status = dto.status;
		}

		const [tickets, total] = await Promise.all([
			this.prisma.client.supportTicket.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				skip: (dto.page! - 1) * dto.limit!,
				take: dto.limit,
				include: {
					user: {
						select: {
							id: true,
							name: true,
							surname: true,
							phoneNumber: true,
							email: true,
						},
					},
				},
			}),
			this.prisma.client.supportTicket.count({ where }),
		]);

		return {
			data: tickets,
			total,
			page: dto.page,
			limit: dto.limit,
			totalPages: Math.ceil(total / dto.limit!),
		};
	}

	async findOne(id: string) {
		const ticket = await this.prisma.client.supportTicket.findUnique({
			where: { id },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						surname: true,
						phoneNumber: true,
						email: true,
					},
				},
			},
		});

		if (!ticket) {
			throw new NotFoundException('Ticket de suporte não encontrado');
		}

		return { data: ticket };
	}

	async update(id: string, dto: UpdateSupportTicketDto) {
		const ticket = await this.prisma.client.supportTicket.findUnique({
			where: { id },
		});

		if (!ticket) {
			throw new NotFoundException('Ticket de suporte não encontrado');
		}

		const updated = await this.prisma.client.supportTicket.update({
			where: { id },
			data: { status: dto.status },
		});

		this.logger.log(
			`Support ticket ${id} status changed to ${dto.status}`,
			'SupportService',
		);

		return { data: updated };
	}
}
