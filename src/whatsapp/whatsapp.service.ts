import {
	Injectable,
	OnModuleInit,
	Inject,
	forwardRef,
	BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { WhatsappGateway } from './whatsapp.gateway';
import { uuidv7 } from 'uuidv7';
import { Client, LocalAuth } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import type { Prisma } from '@prisma/client';

@Injectable()
export class WhatsappService implements OnModuleInit {
	private client: Client | null = null;

	constructor(
		private prisma: PrismaService,
		private logger: LoggerService,
		@Inject(forwardRef(() => WhatsappGateway))
		private gateway: WhatsappGateway,
	) {}

	async onModuleInit() {
		const sessions = await this.prisma.client.whatsAppSession.findMany({
			where: { status: 'CONNECTED' },
			orderBy: { createdAt: 'desc' },
		});
		if (sessions.length === 0) return;

		if (sessions.length > 1) {
			const ids = sessions.slice(1).map((s) => s.id);
			await this.prisma.client.whatsAppSession.updateMany({
				where: { id: { in: ids } },
				data: { status: 'EXPIRED' },
			});
		}

		const latest = sessions[0];
		if (!latest.sessionData) return;

		try {
			await this.initializeClient(
				latest.sessionData as Record<string, unknown>,
			);
		} catch {
			await this.resetSession();
		}
	}

	async connect(): Promise<void> {
		await this.prisma.client.whatsAppSession.updateMany({
			where: { status: 'CONNECTED' },
			data: { status: 'EXPIRED' },
		});

		await this.prisma.client.whatsAppSession.create({
			data: {
				id: uuidv7(),
				status: 'SCANNING',
			},
		});

		try {
			await this.initializeClient();
		} catch {
			await this.prisma.client.whatsAppSession.updateMany({
				where: { status: 'SCANNING' },
				data: { status: 'DISCONNECTED' },
			});
			throw new BadRequestException('Falha ao iniciar conexão WhatsApp');
		}
	}

	async disconnect(): Promise<void> {
		await this.client?.destroy();
		this.client = null;
		await this.resetSession();
	}

	private formatPhone(phoneNumber: string): string {
		const raw = phoneNumber.replace(/[\s+]/g, '');
		const full = raw.startsWith('244') ? raw : `244${raw}`;
		return full + '@c.us';
	}

	async sendOTP(phoneNumber: string, code: string): Promise<void> {
		if (!this.client) {
			throw new BadRequestException('WhatsApp não está conectado');
		}
		const formatted = this.formatPhone(phoneNumber);
		const message = `O teu código de verificação FDA é: ${code}\n\nVálido por 10 minutos. Não partilhes este código com ninguém.`;
		await this.client.sendMessage(formatted, message);
	}

	async sendTest(phoneNumber: string): Promise<void> {
		if (!this.client) {
			throw new BadRequestException('WhatsApp não está conectado');
		}
		const formatted = this.formatPhone(phoneNumber);
		await this.client.sendMessage(
			formatted,
			'Esta é uma mensagem de teste do painel FDA.',
		);
	}

	async getStatus() {
		const session = await this.prisma.client.whatsAppSession.findFirst({
			where: { status: { not: 'EXPIRED' } },
			orderBy: { createdAt: 'desc' },
		});
		if (!session) {
			return {
				status: 'DISCONNECTED',
				phoneNumber: null,
				qrCode: null,
			};
		}
		return {
			status: session.status,
			phoneNumber: session.phoneNumber,
			qrCode: session.qrCode,
		};
	}

	private async initializeClient(sessionData?: Record<string, unknown>) {
		const launchOpts: Record<string, unknown> = {
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
		};

		const puppeteerMod = process.env.CHROME_PATH
			? await import('puppeteer-core')
			: await import('puppeteer');

		if (process.env.CHROME_PATH) {
			launchOpts.executablePath = process.env.CHROME_PATH;
		}

		this.client = new Client(
			Object.assign(
				{
					puppeteer: launchOpts,
					authStrategy: new LocalAuth(),
				},
				sessionData ? { session: sessionData } : {},
			),
		);

		this.client.on('qr', (qr) => {
			void this.handleQr(qr);
		});
		this.client.on('ready', () => {
			void this.handleReady();
		});
		this.client.on('disconnected', (reason) => {
			void this.handleDisconnected(reason);
		});
		this.client.on('auth_failure', () => {
			void this.handleAuthFailure();
		});

		await this.client.initialize();
		void puppeteerMod;
	}

	private async handleQr(qr: string) {
		let qrBase64: string | null = null;
		try {
			qrBase64 = await QRCode.toDataURL(qr);
		} catch {
			qrBase64 = null;
		}

		await this.prisma.client.whatsAppSession.updateMany({
			where: { status: 'SCANNING' },
			data: { qrCode: qrBase64 ?? qr },
		});

		this.gateway.emitQr(qrBase64 ?? qr);
	}

	private async handleReady() {
		const phoneNumber = this.client?.info?.wid?.user
			? `${this.client.info.wid.user}@c.us`
			: null;

		let sessionData: unknown = null;
		try {
			sessionData = await this.client?.getState();
		} catch {
			sessionData = null;
		}

		await this.prisma.client.whatsAppSession.updateMany({
			where: { status: 'SCANNING' },
			data: {
				status: 'CONNECTED',
				phoneNumber,
				sessionData: sessionData as Prisma.InputJsonValue,
				qrCode: null,
			},
		});

		this.gateway.emitStatus('CONNECTED');
	}

	private async handleDisconnected(reason: string) {
		this.logger.log(`WhatsApp disconnected: ${reason}`, 'WhatsappService');
		this.client = null;
		await this.resetSession();
	}

	private async handleAuthFailure() {
		this.logger.log('WhatsApp auth failure', 'WhatsappService');
		this.client = null;
		await this.resetSession();
	}

	private async resetSession() {
		await this.prisma.client.whatsAppSession.updateMany({
			where: { status: { not: 'EXPIRED' } },
			data: { status: 'DISCONNECTED', qrCode: null },
		});
		this.gateway.emitStatus('DISCONNECTED');
	}
}
