import {
	WebSocketGateway,
	WebSocketServer,
	OnGatewayConnection,
	OnGatewayDisconnect,
	SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

interface JwtPayload {
	sub: string;
	email: string;
	role: string;
}

type AuthenticatedSocket = Socket & { user: JwtPayload };

@WebSocketGateway({
	namespace: '/trips',
	cors: {
		origin: '*',
		credentials: true,
	},
})
export class TripGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server!: Server;

	private userSockets = new Map<string, Set<string>>();

	handleConnection(client: AuthenticatedSocket) {
		try {
			const token =
				(client.handshake.auth?.token as string) ??
				(client.handshake.query?.token as string);

			if (!token) {
				client.emit('error', { message: 'Token não fornecido' });
				client.disconnect();
				return;
			}

			const secret = process.env.JWT_SECRET;
			if (!secret) {
				client.emit('error', { message: 'Erro interno do servidor' });
				client.disconnect();
				return;
			}

			const decoded = jwt.verify(token, secret) as JwtPayload;
			client.user = decoded;

			const userId = decoded.sub;
			if (!this.userSockets.has(userId)) {
				this.userSockets.set(userId, new Set());
			}
			this.userSockets.get(userId)!.add(client.id);

			void client.join(`user:${userId}`);
		} catch {
			client.emit('error', { message: 'Token inválido ou expirado' });
			client.disconnect();
		}
	}

	handleDisconnect(client: AuthenticatedSocket) {
		const user = client.user;
		if (user) {
			const sockets = this.userSockets.get(user.sub);
			if (sockets) {
				sockets.delete(client.id);
				if (sockets.size === 0) {
					this.userSockets.delete(user.sub);
				}
			}
		}
	}

	@SubscribeMessage('join:trip')
	handleJoinTrip(client: Socket, tripId: string) {
		void client.join(`trip:${tripId}`);
	}

	@SubscribeMessage('leave:trip')
	handleLeaveTrip(client: Socket, tripId: string) {
		void client.leave(`trip:${tripId}`);
	}

	sendToTripRoom(tripId: string, event: string, data: unknown) {
		this.server.to(`trip:${tripId}`).emit(event, data);
	}

	sendToUser(userId: string, event: string, data: unknown) {
		this.server.to(`user:${userId}`).emit(event, data);
	}
}
