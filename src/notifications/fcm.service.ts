import { Injectable, Logger } from '@nestjs/common';
import {
	initializeApp,
	getApps,
	cert,
} from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FcmService {
	private readonly logger = new Logger(FcmService.name);
	private initialized = false;

	constructor(private prisma: PrismaService) {
		this.initialize();
	}

	private initialize() {
		const projectId = process.env.FCM_PROJECT_ID;
		const privateKey = process.env.FCM_PRIVATE_KEY;
		const clientEmail = process.env.FCM_CLIENT_EMAIL;

		if (!projectId || !privateKey || !clientEmail) {
			this.logger.warn(
				'FCM not configured — skipping initialization. Set FCM_PROJECT_ID, FCM_PRIVATE_KEY, FCM_CLIENT_EMAIL.',
			);
			return;
		}

		try {
			if (getApps().length === 0) {
				initializeApp({
					credential: cert({
						projectId,
						privateKey: privateKey.replace(/\\n/g, '\n'),
						clientEmail,
					}),
				});
			}
			this.initialized = true;
			this.logger.log('FCM initialized successfully');
		} catch (error) {
			this.logger.error('Failed to initialize FCM', error);
		}
	}

	async sendToUser(
		userId: string,
		payload: {
			title: string;
			body: string;
			data?: Record<string, string>;
		},
	): Promise<void> {
		if (!this.initialized) return;

		try {
			const pushTokens = await this.prisma.client.pushToken.findMany({
				where: { userId },
				select: { id: true, token: true },
			});

			if (pushTokens.length === 0) return;

			const message: MulticastMessage = {
				tokens: pushTokens.map((t) => t.token),
				notification: {
					title: payload.title,
					body: payload.body,
				},
				data: payload.data ?? {},
			};

			const messaging = getMessaging();
			const response = await messaging.sendEachForMulticast(message);

			if (response.failureCount > 0) {
				const invalidTokens: string[] = [];
				response.responses.forEach((resp, index) => {
					if (
						!resp.success &&
						resp.error &&
						(resp.error.code === 'messaging/invalid-registration-token' ||
							resp.error.code === 'messaging/registration-token-not-registered')
					) {
						invalidTokens.push(pushTokens[index].id);
					}
				});

				if (invalidTokens.length > 0) {
					await this.prisma.client.pushToken.deleteMany({
						where: { id: { in: invalidTokens } },
					});
					this.logger.warn(
						`Removed ${invalidTokens.length} invalid push tokens for user ${userId}`,
					);
				}
			}
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
}
