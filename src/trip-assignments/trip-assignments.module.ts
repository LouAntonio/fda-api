import { Module } from '@nestjs/common';
import { TripGatewayModule } from '../trip-gateway/trip-gateway.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { TripAssignmentsController } from './trip-assignments.controller';
import { TripAssignmentsService } from './trip-assignments.service';

@Module({
	imports: [TripGatewayModule, DispatchModule],
	controllers: [TripAssignmentsController],
	providers: [TripAssignmentsService],
	exports: [TripAssignmentsService],
})
export class TripAssignmentsModule {}
