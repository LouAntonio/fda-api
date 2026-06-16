import { Module } from '@nestjs/common';
import { TripAssignmentsController } from './trip-assignments.controller';
import { TripAssignmentsService } from './trip-assignments.service';

@Module({
	controllers: [TripAssignmentsController],
	providers: [TripAssignmentsService],
	exports: [TripAssignmentsService],
})
export class TripAssignmentsModule {}
