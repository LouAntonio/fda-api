import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CLEANUP_QUEUE } from '../queue/queue.module';

@Processor(CLEANUP_QUEUE)
@Injectable()
export class CleanupProcessor extends WorkerHost {
	private readonly logger = new Logger(CleanupProcessor.name);

	constructor(private prisma: PrismaService) {
		super();
	}

	async process(job: Job): Promise<void> {
		switch (job.name) {
			case 'expire-stale-trips':
				return this.handleExpireStaleTrips();
			case 'expire-coupons':
				return this.handleExpireCoupons();
			case 'cleanup-sessions':
				return this.handleCleanupSessions();
			case 'cleanup-verifications':
				return this.handleCleanupVerifications();
			default:
				this.logger.warn(`Unknown job name: ${job.name}`);
		}
	}

	private async handleExpireStaleTrips() {
		const cutoff = new Date(Date.now() - 10 * 60 * 1000);

		const result = await this.prisma.client.trip.updateMany({
			where: {
				status: 'REQUESTED',
				createdAt: { lte: cutoff },
				deletedAt: null,
				cancelledAt: null,
			},
			data: {
				status: 'CANCELLED',
				cancelReason:
					'Tempo limite excedido — nenhum motorista disponível',
				cancelledAt: new Date(),
			},
		});

		if (result.count > 0) {
			this.logger.log(`Expired ${result.count} stale trips`);
		}
	}

	private async handleExpireCoupons() {
		const result = await this.prisma.client.coupon.updateMany({
			where: {
				isActive: true,
				expiresAt: { lte: new Date() },
				deletedAt: null,
			},
			data: { isActive: false },
		});

		if (result.count > 0) {
			this.logger.log(`Expired ${result.count} coupons`);
		}
	}

	private async handleCleanupSessions() {
		const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

		const result = await this.prisma.client.session.deleteMany({
			where: {
				expiresAt: { lte: cutoff },
			},
		});

		if (result.count > 0) {
			this.logger.log(`Cleaned up ${result.count} expired sessions`);
		}
	}

	private async handleCleanupVerifications() {
		const result = await this.prisma.client.verification.deleteMany({
			where: {
				expiresAt: { lte: new Date() },
			},
		});

		if (result.count > 0) {
			this.logger.log(`Cleaned up ${result.count} expired verifications`);
		}
	}
}
