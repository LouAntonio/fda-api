import { Module } from '@nestjs/common';
import { TripGatewayModule } from '../trip-gateway/trip-gateway.module';
import { TripLocationPointsController } from './trip-location-points.controller';
import { TripLocationPointsService } from './trip-location-points.service';

@Module({
	imports: [TripGatewayModule],
	controllers: [TripLocationPointsController],
	providers: [TripLocationPointsService],
	exports: [TripLocationPointsService],
})
export class TripLocationPointsModule {}
