import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PAYOUT_QUEUE } from '../queue/queue.module';

export interface PayoutJobData {
	driverId: string;
	amount: number;
	tripId?: string;
}

@Processor(PAYOUT_QUEUE)
@Injectable()
export class PayoutProcessor extends WorkerHost {
	private readonly logger = new Logger(PayoutProcessor.name);

	constructor(private prisma: PrismaService) {
		super();
	}

	async process(job: Job<PayoutJobData>): Promise<void> {
		switch (job.name) {
			case 'process-payout':
				return this.handleProcessPayout(job.data);
			case 'process-batch':
				return this.handleProcessBatch();
			default:
				this.logger.warn(`Unknown job name: ${job.name}`);
		}
	}

	private async handleProcessPayout(data: PayoutJobData) {
		const { driverId, amount } = data;

		await this.prisma.client.$transaction(async (tx) => {
			const [lockedDriver] = await tx.$queryRawUnsafe<
				{ id: string; pendingBalance: number }[]
			>(
				`SELECT id, "pendingBalance" FROM "Driver" WHERE id = $1 FOR UPDATE`,
				driverId,
			);

			if (
				!lockedDriver ||
				lockedDriver.pendingBalance < amount ||
				amount <= 0
			) {
				this.logger.warn(
					`Invalid payout for driver ${driverId}: balance ${lockedDriver?.pendingBalance}, requested ${amount}`,
				);
				return;
			}

			await tx.driver.update({
				where: { id: driverId },
				data: {
					pendingBalance: { decrement: amount },
					availableBalance: { increment: amount },
				},
			});
		});

		this.logger.log(
			`Payout processed for driver ${driverId}: ${amount} Kz`,
		);
	}

	private async handleProcessBatch() {
		const drivers = await this.prisma.client.driver.findMany({
			where: {
				pendingBalance: { gt: 0 },
				deletedAt: null,
			},
			select: { id: true, pendingBalance: true },
		});

		for (const driver of drivers) {
			try {
				await this.handleProcessPayout({
					driverId: driver.id,
					amount: Number(driver.pendingBalance),
				});
			} catch (error) {
				this.logger.error(
					`Batch payout failed for driver ${driver.id}`,
					error,
				);
			}
		}

		this.logger.log(`Batch payout processed for ${drivers.length} drivers`);
	}
}
