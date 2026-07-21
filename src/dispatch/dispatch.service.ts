import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { VehicleType } from '@prisma/client';
import { DISPATCH_QUEUE } from '../queue/queue.module';

export interface OfferTripJobData {
	tripId: string;
	clientId: string;
	pickupLat: number;
	pickupLng: number;
	vehicleType?: VehicleType;
	excludedDriverIds?: string[];
	attempt?: number;
}

export interface DispatchTimeoutJobData {
	tripId: string;
	assignmentId: string;
	clientId: string;
	driverId: string;
	driverUserId: string;
}

export const DISPATCH_TIMEOUT_MS = 30_000;
export const MAX_DISPATCH_ATTEMPTS = 3;

@Injectable()
export class DispatchService {
	private readonly logger = new Logger(DispatchService.name);

	constructor(
		@InjectQueue(DISPATCH_QUEUE) private readonly dispatchQueue: Queue,
	) {}

	async enqueueOfferTrip(data: OfferTripJobData) {
		const jobId = `offer-trip-${data.tripId}-${data.attempt ?? 1}`;
		await this.dispatchQueue.add('offer-trip', data, {
			jobId,
			removeOnComplete: true,
			removeOnFail: false,
		});
		this.logger.log(`Enqueued offer-trip job ${jobId}`);
	}

	async enqueueDispatchTimeout(data: DispatchTimeoutJobData) {
		const jobId = `dispatch-timeout-${data.assignmentId}`;
		await this.dispatchQueue.add('dispatch-timeout', data, {
			jobId,
			delay: DISPATCH_TIMEOUT_MS,
			removeOnComplete: true,
			removeOnFail: false,
		});
		this.logger.log(
			`Enqueued dispatch-timeout job ${jobId} with ${DISPATCH_TIMEOUT_MS}ms delay`,
		);
	}

	async cancelPendingTimeouts(tripId: string) {
		const jobs = await this.dispatchQueue.getJobs(
			['delayed', 'waiting', 'active'],
			0,
			100,
		);
		const timeoutJobs = jobs.filter(
			(j) =>
				j.name === 'dispatch-timeout' &&
				(j.data as { tripId: string }).tripId === tripId,
		);
		for (const job of timeoutJobs) {
			if (await job.isActive()) {
				job.discard();
			}
			await job.remove();
		}
		if (timeoutJobs.length > 0) {
			this.logger.log(
				`Cancelled ${timeoutJobs.length} pending timeouts for trip ${tripId}`,
			);
		}
	}

	async cancelPendingOffers(tripId: string) {
		const jobs = await this.dispatchQueue.getJobs(
			['delayed', 'waiting', 'active'],
			0,
			100,
		);
		const offerJobs = jobs.filter(
			(j) =>
				j.name === 'offer-trip' &&
				(j.data as { tripId: string }).tripId === tripId,
		);
		for (const job of offerJobs) {
			await job.remove();
		}
	}
}
