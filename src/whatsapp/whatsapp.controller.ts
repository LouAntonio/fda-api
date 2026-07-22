import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WhatsappService } from './whatsapp.service';
import { TestMessageDto } from './dto/test-message.dto';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class WhatsappController {
	constructor(private readonly whatsapp: WhatsappService) {}

	@Get('status')
	async getStatus() {
		return this.whatsapp.getStatus();
	}

	@Post('connect')
	async connect() {
		await this.whatsapp.connect();
		return { msg: 'Conexão WhatsApp iniciada' };
	}

	@Post('disconnect')
	async disconnect() {
		await this.whatsapp.disconnect();
		return { msg: 'WhatsApp desconectado' };
	}

	@Post('test')
	@Throttle({ default: { limit: 3, ttl: 60000 } })
	async sendTest(@Body() dto: TestMessageDto) {
		await this.whatsapp.sendTest(dto.phoneNumber);
		return { msg: 'Mensagem de teste enviada' };
	}
}
