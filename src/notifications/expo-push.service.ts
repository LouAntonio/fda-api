import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ExpoPushMessage {
	to: string;
	sound?: string;
	title?: string;
	body?: string;
	data?: Record<string, string>;
	priority?: 'default' | 'normal' | 'high';
	channelId?: string;
	categoryId?: string;
	ttl?: number;
}

interface ExpoPushTicket {
	status: 'ok' | 'error';
	id?: string;
	message?: string;
	details?: { error?: string };
}

interface ExpoPushResponse {
	data: ExpoPushTicket[];
	errors?: { code: string; message: string }[];
}

@Injectable()
export class ExpoPushService {
	private readonly logger = new Logger(ExpoPushService.name);
	private readonly expoApiUrl = 'https://exp.host/--/api/v2/push/send';
	private readonly maxTokensPerRequest = 100;

	constructor(private prisma: PrismaService) {}

	async sendToUser(
		userId: string,
		payload: {
			title: string;
			body: string;
			data?: Record<string, string>;
		},
	): Promise<void> {
		try {
			const pushTokens = await this.prisma.client.pushToken.findMany({
				where: { userId },
				select: { id: true, token: true },
			});

			if (pushTokens.length === 0) return;

			const messages: ExpoPushMessage[] = pushTokens.map((t) => ({
				to: t.token,
				title: payload.title,
				body: payload.body,
				data: payload.data ?? {},
				sound: 'default',
				priority: 'high',
			}));

			await this.sendMessages(messages, pushTokens);
		} catch (error) {
			this.logger.error(
				`Failed to send push notification to user ${userId}`,
				error,
			);
		}
	}

	async sendToMultipleUsers(
		userIds: string[],
		payload: {
			title: string;
			body: string;
			data?: Record<string, string>;
		},
	): Promise<void> {
		await Promise.allSettled(
			userIds.map((userId) => this.sendToUser(userId, payload)),
		);
	}

	private async sendMessages(
		messages: ExpoPushMessage[],
		pushTokens: { id: string; token: string }[],
	): Promise<void> {
		for (let i = 0; i < messages.length; i += this.maxTokensPerRequest) {
			const chunk = messages.slice(i, i + this.maxTokensPerRequest);
			const tokenChunk = pushTokens.slice(
				i,
				i + this.maxTokensPerRequest,
			);

			try {
				await this.sendChunk(chunk, tokenChunk);
			} catch (error) {
				this.logger.error('Failed to send push chunk', error);
			}
		}
	}

	private async sendChunk(
		messages: ExpoPushMessage[],
		tokenChunk: { id: string; token: string }[],
	): Promise<void> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		const accessToken = process.env.EXPO_ACCESS_TOKEN;
		if (accessToken) {
			headers['Authorization'] = `Bearer ${accessToken}`;
		}

		const response = await fetch(this.expoApiUrl, {
			method: 'POST',
			headers,
			body: JSON.stringify(messages),
		});

		if (!response.ok) {
			this.logger.warn(
				`Expo Push API returned ${response.status}: ${await response.text()}`,
			);
			return;
		}

		const result = (await response.json()) as ExpoPushResponse;

		if (result.errors?.length) {
			this.logger.warn(
				`Expo Push API request errors: ${JSON.stringify(result.errors)}`,
			);
		}

		const invalidTokenIds: string[] = [];
		for (let i = 0; i < result.data.length; i++) {
			const ticket = result.data[i];
			if (
				ticket.status === 'error' &&
				ticket.details?.error === 'DeviceNotRegistered'
			) {
				invalidTokenIds.push(tokenChunk[i]?.id);
			}
		}

		if (invalidTokenIds.length > 0) {
			await this.prisma.client.pushToken.deleteMany({
				where: { id: { in: invalidTokenIds.filter(Boolean) } },
			});
			this.logger.warn(
				`Removed ${invalidTokenIds.length} invalid push tokens`,
			);
		}
	}
}
