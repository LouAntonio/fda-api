import {
	WebSocketGateway,
	WebSocketServer,
	OnGatewayConnection,
	OnGatewayDisconnect,
	SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface JwtPayload {
	sub: string;
	email: string;
	role: string;
}

type AuthenticatedSocket = Socket & { user: JwtPayload };

const corsOrigin = (process.env.CORS_ORIGIN ?? '').trim();
@WebSocketGateway({
	namespace: '/trips',
	cors: {
		origin: corsOrigin
			? corsOrigin.split(',').filter(Boolean)
			: ['http://localhost:5173', 'http://localhost:3000'],
		credentials: true,
	},
})
@Injectable()
export class TripGateway implements OnGatewayConnection, OnGatewayDisconnect {
	private readonly logger = new Logger(TripGateway.name);

	@WebSocketServer()
	server!: Server;

	private userSockets = new Map<string, Set<string>>();
	private clientRooms = new Map<string, Set<string>>();

	constructor(private prisma: PrismaService) {}

	hasActiveSocket(userId: string): boolean {
		const sockets = this.userSockets.get(userId);
		return !!sockets && sockets.size > 0;
	}

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
					if (user.role === 'DRIVER') {
						this.markDriverOffline(user.sub);
					}
				}
			}
		}
		this.clientRooms.delete(client.id);
	}

	private async markDriverOffline(userId: string) {
		try {
			const driver = await this.prisma.client.driver.findFirst({
				where: { userId, deletedAt: null },
				select: { id: true, availability: true },
			});
			if (driver && driver.availability === 'ONLINE') {
				await this.prisma.client.driver.update({
					where: { id: driver.id },
					data: { availability: 'OFFLINE' },
				});
				this.logger.log(
					`Driver ${driver.id} auto-set to OFFLINE (WebSocket disconnected)`,
				);
			}
		} catch (error) {
			this.logger.error(
				`Failed to mark driver ${userId} offline on disconnect`,
				error instanceof Error ? error.message : String(error),
			);
		}
	}

	@SubscribeMessage('join:trip')
	async handleJoinTrip(client: AuthenticatedSocket, tripId: string) {
		if (!client.user) {
			client.emit('error', { message: 'Autenticação necessária' });
			return;
		}
		const trip = await this.prisma.client.trip.findUnique({
			where: { id: tripId },
			select: { clientId: true, driverId: true },
		});
		const userId = client.user.sub;
		if (!trip || (trip.clientId !== userId && trip.driverId !== userId)) {
			client.emit('error', {
				message: 'Não tem permissão para subscrever esta viagem',
			});
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
