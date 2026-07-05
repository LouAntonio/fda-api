import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

const DISPATCH_QUEUE = 'dispatch';
const PAYOUT_QUEUE = 'payout';
const CLEANUP_QUEUE = 'cleanup';

@Global()
@Module({
	imports: [
		BullModule.forRoot({
			connection: {
				url: process.env.REDIS_URL ?? 'redis://localhost:6379',
			},
			defaultJobOptions: {
				attempts: Number(process.env.BULL_DEFAULT_ATTEMPTS ?? 3),
				backoff: {
					type: 'exponential',
					delay: Number(process.env.BULL_DELAY_ON_ERROR ?? 5000),
				},
				removeOnComplete: 100,
				removeOnFail: 50,
			},
		}),
		BullModule.registerQueue(
			{ name: DISPATCH_QUEUE },
			{ name: PAYOUT_QUEUE },
			{ name: CLEANUP_QUEUE },
		),
	],
	exports: [BullModule],
})
export class QueueModule {}

export { DISPATCH_QUEUE, PAYOUT_QUEUE, CLEANUP_QUEUE };
