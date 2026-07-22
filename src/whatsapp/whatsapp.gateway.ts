import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Namespace } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { WhatsAppSessionStatus } from '@prisma/client';

@WebSocketGateway({
	namespace: '/whatsapp',
	cors: {
		origin: (process.env.CORS_ORIGIN ?? '').split(',').filter(Boolean),
		credentials: true,
	},
})
@Injectable()
export class WhatsappGateway {
	@WebSocketServer()
	server!: Namespace;

	emitQr(qrCode: string) {
		this.server.emit('whatsapp:qr', { qrCode });
	}

	emitStatus(status: WhatsAppSessionStatus) {
		this.server.emit('whatsapp:status', { status });
	}
}
