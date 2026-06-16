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
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		ThrottlerModule.forRoot([
			{
				ttl: Number(process.env.THROTTLE_TTL ?? 60000),
				limit: Number(process.env.THROTTLE_LIMIT ?? 10),
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
	],
	controllers: [AppController],
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
