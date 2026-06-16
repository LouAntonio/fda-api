import { Module } from '@nestjs/common';
import { PriceConfigController } from './price-config.controller';
import { PriceConfigService } from './price-config.service';

@Module({
	controllers: [PriceConfigController],
	providers: [PriceConfigService],
	exports: [PriceConfigService],
})
export class PriceConfigModule {}
