import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { LoggerModule } from './logger/logger.module';
import { AuthModule } from './auth/auth.module';
import { ResendModule } from './email/resend.module';
import { UsersModule } from './users/users.module';
import { UploadsModule } from './uploads/uploads.module';
import { CouponsModule } from './coupons/coupons.module';
import { DriversModule } from './drivers/drivers.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { FleetsModule } from './fleets/fleets.module';
import { PriceConfigModule } from './price-config/price-config.module';
import { ZonesModule } from './zones/zones.module';
import { TripsModule } from './trips/trips.module';
import { TripGatewayModule } from './trip-gateway/trip-gateway.module';
import { TripAssignmentsModule } from './trip-assignments/trip-assignments.module';
import { DeliveryDetailsModule } from './delivery-details/delivery-details.module';
import { TripEventsModule } from './trip-events/trip-events.module';
import { TripLocationPointsModule } from './trip-location-points/trip-location-points.module';
import { FinancialTransactionsModule } from './financial-transactions/financial-transactions.module';
import { DriverPayoutsModule } from './driver-payouts/driver-payouts.module';
import { DisputesModule } from './disputes/disputes.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { SupportModule } from './support/support.module';
import { AppController } from './app.controller';
import { HealthController } from './health/health.controller';
import { AppService } from './app.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		ThrottlerModule.forRoot([
			{
				ttl: Number(process.env.THROTTLE_TTL ?? 60000),
				limit: Number(process.env.THROTTLE_LIMIT ?? 100),
			},
		]),
		PrismaModule,
		LoggerModule,
		AuthModule,
		ResendModule,
		UsersModule,
		UploadsModule,
		CouponsModule,
		DriversModule,
		VehiclesModule,
		FleetsModule,
		PriceConfigModule,
		ZonesModule,
		TripsModule,
		TripGatewayModule,
		TripAssignmentsModule,
		DeliveryDetailsModule,
		TripEventsModule,
		TripLocationPointsModule,
		FinancialTransactionsModule,
		DriverPayoutsModule,
		DisputesModule,
		ReviewsModule,
		AuditLogsModule,
		SupportModule,
	],
	controllers: [AppController, HealthController],
	providers: [
		AppService,
		{
			provide: APP_PIPE,
			useFactory: () =>
				new ValidationPipe({
					whitelist: true,
					forbidNonWhitelisted: true,
					transform: true,
				}),
		},
		{
			provide: APP_FILTER,
			useClass: HttpExceptionFilter,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: ResponseInterceptor,
		},
	],
})
export class AppModule {}
