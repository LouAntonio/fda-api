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
		origin: process.env.CORS_ORIGIN
			? process.env.CORS_ORIGIN.split(',')
			: ['http://localhost:5173', 'http://localhost:3000'],
		credentials: true,
	},
})
export class TripGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server!: Server;

	private userSockets = new Map<string, Set<string>>();
	private clientRooms = new Map<string, Set<string>>();

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

			const userRoom = `user:${userId}`;
			void client.join(userRoom);
			this.trackRoom(client.id, userRoom);
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
		this.clientRooms.delete(client.id);
	}

	@SubscribeMessage('join:trip')
	handleJoinTrip(client: AuthenticatedSocket, tripId: string) {
		if (!client.user) {
			client.emit('error', { message: 'Autenticação necessária' });
			return;
		}
		const room = `trip:${tripId}`;
		void client.join(room);
		this.trackRoom(client.id, room);
	}

	@SubscribeMessage('leave:trip')
	handleLeaveTrip(client: Socket, tripId: string) {
		const room = `trip:${tripId}`;
		void client.leave(room);
		this.untrackRoom(client.id, room);
	}

	@SubscribeMessage('ping')
	handlePing(client: Socket) {
		client.emit('pong', { timestamp: new Date().toISOString() });
	}

	@SubscribeMessage('rejoin:rooms')
	handleRejoinRooms(client: AuthenticatedSocket) {
		const rooms = this.clientRooms.get(client.id);
		if (rooms) {
			for (const room of rooms) {
				void client.join(room);
			}
		}
		client.emit('rejoin:rooms:ack', {
			rooms: Array.from(rooms ?? []),
			timestamp: new Date().toISOString(),
		});
	}

	private trackRoom(clientId: string, room: string) {
		if (!this.clientRooms.has(clientId)) {
			this.clientRooms.set(clientId, new Set());
		}
		this.clientRooms.get(clientId)!.add(room);
	}

	private untrackRoom(clientId: string, room: string) {
		const rooms = this.clientRooms.get(clientId);
		if (rooms) {
			rooms.delete(room);
			if (rooms.size === 0) {
				this.clientRooms.delete(clientId);
			}
		}
	}

	sendToTripRoom(tripId: string, event: string, data: unknown) {
		this.server.to(`trip:${tripId}`).emit(event, data);
	}

	sendToUser(userId: string, event: string, data: unknown) {
		this.server.to(`user:${userId}`).emit(event, data);
	}
}
