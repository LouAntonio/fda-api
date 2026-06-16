import { Module } from '@nestjs/common';
import { DriverPayoutsController } from './driver-payouts.controller';
import { DriverPayoutsService } from './driver-payouts.service';

@Module({
	controllers: [DriverPayoutsController],
	providers: [DriverPayoutsService],
	exports: [DriverPayoutsService],
})
export class DriverPayoutsModule {}
