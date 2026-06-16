import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TripGateway } from './trip-gateway';
import { TripGatewayService } from './trip-gateway.service';

@Module({
	imports: [ConfigModule],
	providers: [TripGateway, TripGatewayService],
	exports: [TripGatewayService],
})
export class TripGatewayModule {}
