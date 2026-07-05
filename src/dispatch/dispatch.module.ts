import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DispatchProcessor } from './dispatch.processor';
import { DispatchService } from './dispatch.service';
import { DISPATCH_QUEUE } from '../queue/queue.module';

@Module({
	imports: [BullModule.registerQueue({ name: DISPATCH_QUEUE })],
	providers: [DispatchProcessor, DispatchService],
	exports: [DispatchService],
})
export class DispatchModule {}
