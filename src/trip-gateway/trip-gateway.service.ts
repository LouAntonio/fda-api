import { Injectable } from '@nestjs/common';
import { TripGateway } from './trip-gateway';

@Injectable()
export class TripGatewayService {
	constructor(private gateway: TripGateway) {}

	emitTripStatus(
		tripId: string,
		status: string,
		data?: Record<string, unknown>,
	) {
		this.gateway.sendToTripRoom(tripId, 'trip:status', {
			tripId,
			status,
			updatedAt: new Date().toISOString(),
			...(data ?? {}),
		});
	}

	emitDriverAssigned(
		tripId: string,
		driver: { id: string; name: string; phoneNumber: string | null },
		vehicle?: {
			plateNumber: string;
			brand: string;
			model: string;
			color: string;
		},
	) {
		this.gateway.sendToTripRoom(tripId, 'trip:driver_assigned', {
			tripId,
			driver,
			vehicle,
		});
	}

	sendToTripRoom(
		tripId: string,
		event: string,
		data: Record<string, unknown>,
	) {
		this.gateway.sendToTripRoom(tripId, event, data);
	}

	emitDriverLocation(tripId: string, lat: number, lng: number) {
		this.gateway.sendToTripRoom(tripId, 'trip:location', {
			tripId,
			lat,
			lng,
		});
	}

	emitDeliveryStatus(tripId: string, deliveryStatus: string) {
		this.gateway.sendToTripRoom(tripId, 'trip:delivery_status', {
			tripId,
			deliveryStatus,
			updatedAt: new Date().toISOString(),
		});
	}
}
