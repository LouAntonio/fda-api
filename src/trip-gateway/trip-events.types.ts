export interface TripStatusEvent {
	tripId: string;
	status: string;
	updatedAt: string;
	clientId?: string;
	serviceType?: string;
	cancelReason?: string;
	cancelledBy?: string;
}

export interface TripDriverAssignedEvent {
	tripId: string;
	driver: {
		id: string;
		name: string;
		phoneNumber: string | null;
	};
	vehicle?: {
		plateNumber: string;
		brand: string;
		model: string;
		color: string;
	};
}

export interface TripLocationEvent {
	tripId: string;
	lat: number;
	lng: number;
	speed?: number;
	heading?: number;
	recordedAt: string;
}

export interface TripDeliveryStatusEvent {
	tripId: string;
	deliveryStatus: string;
	updatedAt: string;
}

export interface TripPaymentUpdateEvent {
	tripId: string;
	paymentStatus: string;
	updatedAt: string;
}

export interface TripOfferEvent {
	assignmentId: string;
	tripId: string;
	pickupAddress: string;
	dropoffAddress: string;
	estimatedDistanceKm: number;
	estimatedDurationMin: number;
	totalPrice: number;
	driverId: string;
	driverName: string;
}

export interface TripOfferAcceptedEvent {
	assignmentId: string;
	tripId: string;
	driver: {
		id: string;
		name: string;
		phoneNumber: string | null;
	};
	vehicle?: {
		plateNumber: string;
		brand: string;
		model: string;
		color: string;
	};
}

export interface TripOfferRejectedEvent {
	assignmentId: string;
	tripId: string;
	driverId: string;
	reason?: string;
}

export interface TripOfferExpiredEvent {
	assignmentId: string;
	tripId: string;
}
