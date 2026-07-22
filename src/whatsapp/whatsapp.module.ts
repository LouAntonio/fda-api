import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappGateway } from './whatsapp.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
	imports: [PrismaModule, LoggerModule],
	controllers: [WhatsappController],
	providers: [WhatsappService, WhatsappGateway],
	exports: [WhatsappService],
})
export class WhatsappModule {}
