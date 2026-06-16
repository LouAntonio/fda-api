import { Module } from '@nestjs/common';
import { TripLocationPointsController } from './trip-location-points.controller';
import { TripLocationPointsService } from './trip-location-points.service';

@Module({
	controllers: [TripLocationPointsController],
	providers: [TripLocationPointsService],
	exports: [TripLocationPointsService],
})
export class TripLocationPointsModule {}
