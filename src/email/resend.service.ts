import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class ResendService {
	private resend: Resend;

	constructor() {
		this.resend = new Resend(process.env.RESEND_API_KEY);
	}

	async sendEmail(params: {
		from: string;
		to: string | string[];
		subject: string;
		html: string;
	}) {
		return this.resend.emails.send(params);
	}

	async sendVerificationEmail(
		to: string,
		name?: string,
		verificationLink?: string,
	) {
		const from =
			process.env.RESEND_FROM ?? 'Ticketzone <noreply@Ticketzone.com>';

		return this.sendEmail({
			from,
			to,
			subject: 'Confirme seu email - Ticketzone',
			html: `
				<h1>Confirme seu email</h1>
				<p>Olá, ${name ?? 'usuário'}!</p>
				<p>Clique no link abaixo para confirmar seu endereço de email:</p>
				<p>
					<a href="${verificationLink}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;">
						Confirmar email
					</a>
				</p>
				<p>Este link expira em 24 horas.</p>
				<p>Se você não criou uma conta, ignore este email.</p>
			`,
		});
	}

	async sendWelcomeEmail(to: string, name?: string) {
		const from =
			process.env.RESEND_FROM ?? 'Ticketzone <noreply@Ticketzone.com>';

		return this.sendEmail({
			from,
			to,
			subject: 'Bem-vindo ao Ticketzone!',
			html: `
				<h1>Bem-vindo, ${name ?? 'usuário'}!</h1>
				<p>Sua conta foi criada com sucesso no Ticketzone.</p>
				<p>Agora você pode comprar bilhetes, criar eventos e muito mais.</p>
			`,
		});
	}

	async sendEmailVerifiedEmail(to: string, name?: string) {
		const from =
			process.env.RESEND_FROM ?? 'Ticketzone <noreply@Ticketzone.com>';

		return this.sendEmail({
			from,
			to,
			subject: 'Email verificado - Ticketzone',
			html: `
				<h1>Email verificado</h1>
				<p>Olá, ${name ?? 'utilizador'}!</p>
				<p>O teu email foi verificado com sucesso.</p>
				<p>Agora já podes aceder a todas as funcionalidades da plataforma Ticketzone.</p>
			`,
		});
	}

	async sendRoleChangedEmail(to: string, name?: string, newRole?: string) {
		const from =
			process.env.RESEND_FROM ?? 'Ticketzone <noreply@Ticketzone.com>';

		return this.sendEmail({
			from,
			to,
			subject: 'A sua função foi atualizada - Ticketzone',
			html: `
				<h1>Função atualizada</h1>
				<p>Olá, ${name ?? 'usuário'}!</p>
				<p>A sua função na plataforma Ticketzone foi alterada para <strong>${newRole}</strong>.</p>
				<p>Se tens alguma dúvida, contacta o suporte.</p>
			`,
		});
	}

	async sendAccountBannedEmail(
		to: string,
		name?: string,
		motive?: string,
		bannedUntil?: Date,
	) {
		const from =
			process.env.RESEND_FROM ?? 'Ticketzone <noreply@Ticketzone.com>';
		const untilText = bannedUntil
			? ` até ${bannedUntil.toLocaleDateString('pt-PT')}`
			: ' por tempo indeterminado';

		return this.sendEmail({
			from,
			to,
			subject: 'A sua conta foi banida - Ticketzone',
			html: `
				<h1>Conta banida</h1>
				<p>Olá, ${name ?? 'usuário'}!</p>
				<p>A sua conta no Ticketzone foi banida${untilText}.</p>
				<p><strong>Motivo:</strong> ${motive ?? 'Não especificado'}</p>
				<p>Se achas que isto foi um erro, contacta o suporte.</p>
			`,
		});
	}

	async sendAccountUnbannedEmail(to: string, name?: string) {
		const from =
			process.env.RESEND_FROM ?? 'Ticketzone <noreply@Ticketzone.com>';

		return this.sendEmail({
			from,
			to,
			subject: 'A sua conta foi reativada - Ticketzone',
			html: `
				<h1>Conta reativada</h1>
				<p>Olá, ${name ?? 'usuário'}!</p>
				<p>A sua conta no Ticketzone foi reativada. Já podes usar a plataforma normalmente.</p>
			`,
		});
	}

	async sendPromoterApprovedEmail(to: string, name?: string) {
		const from =
			process.env.RESEND_FROM ?? 'Ticketzone <noreply@Ticketzone.com>';

		return this.sendEmail({
			from,
			to,
			subject: 'Conta de promotor verificada - Ticketzone',
			html: `
				<h1>Parabéns, ${name ?? 'promotor'}!</h1>
				<p>A sua conta de promotor foi verificada com sucesso.</p>
				<p>Já pode criar eventos e gerir os seus bilhetes na plataforma Ticketzone.</p>
			`,
		});
	}

	async sendPromoterRejectedEmail(
		to: string,
		name?: string,
		motive?: string,
	) {
		const from =
			process.env.RESEND_FROM ?? 'Ticketzone <noreply@Ticketzone.com>';

		return this.sendEmail({
			from,
			to,
			subject: 'Solicitação de promotor rejeitada - Ticketzone',
			html: `
				<h1>Solicitação rejeitada</h1>
				<p>Olá, ${name ?? 'usuário'}!</p>
				<p>Infelizmente a sua solicitação para se tornar promotor no Ticketzone foi rejeitada.</p>
				<p><strong>Motivo:</strong> ${motive ?? 'Não especificado'}</p>
				<p>Se achas que isto foi um erro, contacta o suporte.</p>
			`,
		});
	}

	async sendPasswordResetEmail(
		to: string,
		name?: string,
		resetLink?: string,
	) {
		const from =
			process.env.RESEND_FROM ?? 'Ticketzone <noreply@Ticketzone.com>';

		return this.sendEmail({
			from,
			to,
			subject: 'Recuperação de senha - Ticketzone',
			html: `
				<h1>Recuperação de senha</h1>
				<p>Olá, ${name ?? 'usuário'}!</p>
				<p>Recebemos uma solicitação de recuperação de senha para sua conta.</p>
				<p>
					<a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;">
						Redefinir senha
					</a>
				</p>
				<p>Este link expira em 1 hora.</p>
				<p>Se você não solicitou esta recuperação, ignore este email.</p>
			`,
		});
	}

	async sendEventPendingApproval(
		to: string,
		promoterName?: string,
		eventTitle?: string,
		eventId?: string,
	) {
		const from =
			process.env.RESEND_FROM ?? 'Ticketzone <noreply@Ticketzone.com>';
		const adminUrl = `${process.env.FRONTEND_URL ?? ''}/admin/events/${eventId}`;

		return this.sendEmail({
			from,
			to,
			subject: 'Novo evento pendente de aprovação - Ticketzone',
			html: `
				<h1>Novo evento para revisão</h1>
				<p>O promotor <strong>${promoterName ?? 'desconhecido'}</strong> criou um novo evento:</p>
				<p><strong>${eventTitle ?? 'Sem título'}</strong></p>
				<p>
					<a href="${adminUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;">
						Rever evento
					</a>
				</p>
			`,
		});
	}

	async sendEventApproved(to: string, name?: string, eventTitle?: string) {
		const from =
			process.env.RESEND_FROM ?? 'Ticketzone <noreply@Ticketzone.com>';

		return this.sendEmail({
			from,
			to,
			subject: 'Evento aprovado - Ticketzone',
			html: `
				<h1>Evento aprovado</h1>
				<p>Olá, ${name ?? 'promotor'}!</p>
				<p>O teu evento <strong>${eventTitle ?? 'Sem título'}</strong> foi aprovado pela equipa Ticketzone.</p>
				<p>O evento já está visível para o público.</p>
			`,
		});
	}

	async sendEventRejected(
		to: string,
		name?: string,
		eventTitle?: string,
		motive?: string,
	) {
		const from =
			process.env.RESEND_FROM ?? 'Ticketzone <noreply@Ticketzone.com>';

		return this.sendEmail({
			from,
			to,
			subject: 'Evento não aprovado - Ticketzone',
			html: `
				<h1>Evento não aprovado</h1>
				<p>Olá, ${name ?? 'promotor'}!</p>
				<p>O teu evento <strong>${eventTitle ?? 'Sem título'}</strong> não foi aprovado.</p>
				<p><strong>Motivo:</strong> ${motive ?? 'Não especificado'}</p>
				<p>Se achas que isto foi um erro, contacta o suporte.</p>
			`,
		});
	}

	async sendOrderReceived(
		to: string,
		name?: string,
		orderId?: string,
		totalAmount?: string,
		items?: { name: string; qty: number; price: string }[],
	) {
		const from =
			process.env.RESEND_FROM ?? 'Ticketzone <noreply@Ticketzone.com>';

		const itemsHtml = (items ?? [])
			.map(
				(item) =>
					`<tr><td>${item.name} x${item.qty}</td><td style="text-align:right">${item.price} Kz</td></tr>`,
			)
			.join('');

		return this.sendEmail({
			from,
			to,
			subject: 'Pedido recebido - Ticketzone',
			html: `
				<h1>Pedido recebido</h1>
				<p>Olá, ${name ?? 'utilizador'}!</p>
				<p>O teu pedido <strong>#${orderId?.slice(0, 8) ?? ''}</strong> foi recebido com sucesso.</p>
				<p>O pagamento ainda está pendente. Assim que o pagamento for confirmado, receberás um email de confirmação.</p>
				<table style="width:100%;border-collapse:collapse;margin:16px 0">
					<thead>
						<tr style="border-bottom:1px solid #ddd">
							<th style="text-align:left">Item</th>
							<th style="text-align:right">Valor</th>
						</tr>
					</thead>
					<tbody>${itemsHtml}</tbody>
					<tfoot>
						<tr style="border-top:1px solid #ddd;font-weight:bold">
							<td>Total</td>
							<td style="text-align:right">${totalAmount ?? '0.00'} Kz</td>
						</tr>
					</tfoot>
				</table>
				<p>Os teus bilhetes estarão disponíveis na tua conta após a confirmação do pagamento.</p>
			`,
		});
	}

	async sendOrderConfirmed(
		to: string,
		name?: string,
		orderId?: string,
		totalAmount?: string,
		items?: { name: string; qty: number; price: string }[],
	) {
		const from =
			process.env.RESEND_FROM ?? 'Ticketzone <noreply@Ticketzone.com>';

		const itemsHtml = (items ?? [])
			.map(
				(item) =>
					`<tr><td>${item.name} x${item.qty}</td><td style="text-align:right">${item.price} Kz</td></tr>`,
			)
			.join('');

		return this.sendEmail({
			from,
			to,
			subject: 'Pedido confirmado - Ticketzone',
			html: `
				<h1>Pedido confirmado</h1>
				<p>Olá, ${name ?? 'utilizador'}!</p>
				<p>O teu pedido <strong>#${orderId?.slice(0, 8) ?? ''}</strong> foi confirmado e o pagamento foi recebido com sucesso.</p>
				<table style="width:100%;border-collapse:collapse;margin:16px 0">
					<thead>
						<tr style="border-bottom:1px solid #ddd">
							<th style="text-align:left">Item</th>
							<th style="text-align:right">Valor</th>
						</tr>
					</thead>
					<tbody>${itemsHtml}</tbody>
					<tfoot>
						<tr style="border-top:1px solid #ddd;font-weight:bold">
							<td>Total</td>
							<td style="text-align:right">${totalAmount ?? '0.00'} Kz</td>
						</tr>
					</tfoot>
				</table>
				<p>Os teus bilhetes já estão disponíveis na tua conta.</p>
			`,
		});
	}

	async sendEventCancelled(to: string, name?: string, eventTitle?: string) {
		const from =
			process.env.RESEND_FROM ?? 'Ticketzone <noreply@Ticketzone.com>';

		return this.sendEmail({
			from,
			to,
			subject: 'Evento cancelado - Ticketzone',
			html: `
				<h1>Evento cancelado</h1>
				<p>Olá, ${name ?? 'utilizador'}!</p>
				<p>Infelizmente o evento <strong>${eventTitle ?? 'Sem título'}</strong> foi cancelado.</p>
				<p>Se adquiriste bilhetes, o reembolso será processado em breve.</p>
				<p>Pedimos desculpa pelo inconveniente.</p>
			`,
		});
	}

	async sendSalesPausedEmail(
		to: string,
		name?: string,
		eventTitle?: string,
		promoterName?: string,
	) {
		const from =
			process.env.RESEND_FROM ?? 'Ticketzone <noreply@Ticketzone.com>';

		return this.sendEmail({
			from,
			to,
			subject: `Vendas pausadas - ${eventTitle ?? 'Evento'} - Ticketzone`,
			html: `
				<h1>Vendas pausadas</h1>
				<p>Olá, ${name ?? 'utilizador'}!</p>
				<p>O promotor <strong>${promoterName ?? 'desconhecido'}</strong> pausou as vendas de bilhetes para o evento <strong>${eventTitle ?? 'Sem título'}</strong>.</p>
				<p>Se já adquiriste bilhetes, eles continuam válidos.</p>
				<p>Fica atento para quando as vendas forem retomadas.</p>
			`,
		});
	}

	async sendSalesResumedEmail(
		to: string,
		name?: string,
		eventTitle?: string,
		promoterName?: string,
	) {
		const from =
			process.env.RESEND_FROM ?? 'Ticketzone <noreply@Ticketzone.com>';

		return this.sendEmail({
			from,
			to,
			subject: `Vendas retomadas - ${eventTitle ?? 'Evento'} - Ticketzone`,
			html: `
				<h1>Vendas retomadas</h1>
				<p>Olá, ${name ?? 'utilizador'}!</p>
				<p>O promotor <strong>${promoterName ?? 'desconhecido'}</strong> retomou as vendas de bilhetes para o evento <strong>${eventTitle ?? 'Sem título'}</strong>.</p>
				<p>Já podes adquirir os teus bilhetes!</p>
			`,
		});
	}

	async sendAddedAsTicketValidatorEmail(
		to: string,
		name?: string,
		eventTitle?: string,
		promoterName?: string,
	) {
		const from =
			process.env.RESEND_FROM ?? 'Ticketzone <noreply@Ticketzone.com>';

		return this.sendEmail({
			from,
			to,
			subject: `Foste adicionado como validador - ${eventTitle ?? 'Evento'} - Ticketzone`,
			html: `
				<h1>Validador de bilhetes</h1>
				<p>Olá, ${name ?? 'utilizador'}!</p>
				<p>O promotor <strong>${promoterName ?? 'desconhecido'}</strong> adicionou-te como validador de bilhetes para o evento <strong>${eventTitle ?? 'Sem título'}</strong>.</p>
				<p>Agora podes validar bilhetes neste evento usando a aplicação Ticketzone.</p>
			`,
		});
	}

	async sendRemovedAsTicketValidatorEmail(
		to: string,
		name?: string,
		eventTitle?: string,
	) {
		const from =
			process.env.RESEND_FROM ?? 'Ticketzone <noreply@Ticketzone.com>';

		return this.sendEmail({
			from,
			to,
			subject: `Removido como validador - ${eventTitle ?? 'Evento'} - Ticketzone`,
			html: `
				<h1>Removido como validador</h1>
				<p>Olá, ${name ?? 'utilizador'}!</p>
				<p>Foste removido como validador de bilhetes para o evento <strong>${eventTitle ?? 'Sem título'}</strong>.</p>
				<p>Se achas que isto foi um erro, contacta o promotor do evento.</p>
			`,
		});
	}
}
