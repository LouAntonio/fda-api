import { Module } from '@nestjs/common';
import { CouponsModule } from '../coupons/coupons.module';
import { TripGatewayModule } from '../trip-gateway/trip-gateway.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { MapboxService } from '../common/services/mapbox.service';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
	imports: [CouponsModule, TripGatewayModule, DispatchModule],
	controllers: [TripsController],
	providers: [TripsService, MapboxService],
	exports: [TripsService],
})
export class TripsModule {}
