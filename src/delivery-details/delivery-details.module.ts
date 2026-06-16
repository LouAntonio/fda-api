import { Module } from '@nestjs/common';
import { DeliveryDetailsController } from './delivery-details.controller';
import { DeliveryDetailsService } from './delivery-details.service';

@Module({
	controllers: [DeliveryDetailsController],
	providers: [DeliveryDetailsService],
	exports: [DeliveryDetailsService],
})
export class DeliveryDetailsModule {}
