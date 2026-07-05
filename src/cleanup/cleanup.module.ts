import { Module, OnModuleInit } from '@nestjs/common';
import { InjectQueue, BullModule } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CleanupProcessor } from './cleanup.processor';
import { CLEANUP_QUEUE } from '../queue/queue.module';

@Module({
	imports: [BullModule.registerQueue({ name: CLEANUP_QUEUE })],
	providers: [CleanupProcessor],
})
export class CleanupModule implements OnModuleInit {
	constructor(
		@InjectQueue(CLEANUP_QUEUE) private readonly cleanupQueue: Queue,
	) {}

	async onModuleInit() {
		const repeatableJobs = await this.cleanupQueue.getJobSchedulers();

		if (
			!repeatableJobs.find((j) => j.key?.includes('expire-stale-trips'))
		) {
			await this.cleanupQueue.upsertJobScheduler(
				'expire-stale-trips',
				{ pattern: '*/5 * * * *' },
				{
					name: 'expire-stale-trips',
					data: {},
					opts: { removeOnComplete: true },
				},
			);
		}

		if (!repeatableJobs.find((j) => j.key?.includes('expire-coupons'))) {
			await this.cleanupQueue.upsertJobScheduler(
				'expire-coupons',
				{ pattern: '0 0 * * *' },
				{
					name: 'expire-coupons',
					data: {},
					opts: { removeOnComplete: true },
				},
			);
		}

		if (!repeatableJobs.find((j) => j.key?.includes('cleanup-sessions'))) {
			await this.cleanupQueue.upsertJobScheduler(
				'cleanup-sessions',
				{ pattern: '0 3 * * *' },
				{
					name: 'cleanup-sessions',
					data: {},
					opts: { removeOnComplete: true },
				},
			);
		}

		if (
			!repeatableJobs.find((j) =>
				j.key?.includes('cleanup-verifications'),
			)
		) {
			await this.cleanupQueue.upsertJobScheduler(
				'cleanup-verifications',
				{ pattern: '0 4 * * *' },
				{
					name: 'cleanup-verifications',
					data: {},
					opts: { removeOnComplete: true },
				},
			);
		}
	}
}
