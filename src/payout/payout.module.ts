import { Module } from '@nestjs/common';
import { PayoutProcessor } from './payout.processor';

@Module({
	providers: [PayoutProcessor],
})
export class PayoutModule {}
