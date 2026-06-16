import { Module } from '@nestjs/common';
import { TripEventsController } from './trip-events.controller';
import { TripEventsService } from './trip-events.service';

@Module({
	controllers: [TripEventsController],
	providers: [TripEventsService],
	exports: [TripEventsService],
})
export class TripEventsModule {}
