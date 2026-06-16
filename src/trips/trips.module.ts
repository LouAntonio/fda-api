import { Module } from '@nestjs/common';
import { CouponsModule } from '../coupons/coupons.module';
import { TripGatewayModule } from '../trip-gateway/trip-gateway.module';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
	imports: [CouponsModule, TripGatewayModule],
	controllers: [TripsController],
	providers: [TripsService],
	exports: [TripsService],
})
export class TripsModule {}
