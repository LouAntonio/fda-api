import { Module } from '@nestjs/common';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { DriversModule } from '../drivers/drivers.module';

@Module({
	imports: [DriversModule],
	controllers: [VehiclesController],
	providers: [VehiclesService],
	exports: [VehiclesService],
})
export class VehiclesModule {}
