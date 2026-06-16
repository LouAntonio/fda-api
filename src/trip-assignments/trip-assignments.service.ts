import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreateTripAssignmentDto } from './dto/create-trip-assignment.dto';
import { UpdateTripAssignmentDto } from './dto/update-trip-assignment.dto';
import { ListTripAssignmentsDto } from './dto/list-trip-assignments.dto';

const defaultAssignmentSelect = {
	id: true,
	tripId: true,
	driverId: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
} as const;

@Injectable()
export class TripAssignmentsService {
	constructor(
		private prisma: PrismaService,
		private logger: LoggerService,
	) {}

	async create(dto: CreateTripAssignmentDto) {
		const trip = await this.prisma.client.trip.findUnique({
			where: { id: dto.tripId },
			select: { id: true },
		});

		if (!trip) {
			throw new NotFoundException('Viagem não encontrada');
		}

		const driver = await this.prisma.client.driver.findUnique({
			where: { id: dto.driverId },
			select: { id: true },
		});

		if (!driver) {
			throw new NotFoundException('Motorista não encontrado');
		}

		const assignment = await this.prisma.client.tripAssignment.create({
			data: {
				id: uuidv7(),
				tripId: dto.tripId,
				driverId: dto.driverId,
			},
			select: defaultAssignmentSelect,
		});

		this.logger.log(
			`TripAssignment ${assignment.id} created for trip ${dto.tripId} driver ${dto.driverId}`,
			'TripAssignmentsService',
		);

		return assignment;
	}

	async list(dto: ListTripAssignmentsDto) {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 20;
		const skip = (page - 1) * limit;

		const where: Record<string, unknown> = {};

		if (!dto.includeDeleted) {
			where.deletedAt = null;
		}

		if (dto.tripId) where.tripId = dto.tripId;
		if (dto.driverId) where.driverId = dto.driverId;
		if (dto.status) where.status = dto.status;

		const orderBy: Record<string, string> = {};
		orderBy[dto.sortBy ?? 'createdAt'] = dto.sortOrder ?? 'desc';

		const [assignments, total] = await Promise.all([
			this.prisma.client.tripAssignment.findMany({
				where,
				skip,
				take: limit,
				orderBy,
				select: {
					...defaultAssignmentSelect,
					trip: {
						select: {
							id: true,
							status: true,
							pickupAddress: true,
							dropoffAddress: true,
						},
					},
					driver: {
						select: {
							id: true,
							biNumber: true,
							user: {
								select: {
									id: true,
									name: true,
									surname: true,
									phoneNumber: true,
								},
							},
						},
					},
				},
			}),
			this.prisma.client.tripAssignment.count({ where }),
		]);

		return {
			assignments,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findById(id: string) {
		const assignment =
			await this.prisma.client.tripAssignment.findUnique({
				where: { id },
				select: {
					...defaultAssignmentSelect,
					trip: {
						select: {
							id: true,
							status: true,
							pickupAddress: true,
							dropoffAddress: true,
							clientId: true,
						},
					},
					driver: {
						select: {
							id: true,
							biNumber: true,
							licenseNumber: true,
							user: {
								select: {
									id: true,
									name: true,
									surname: true,
									phoneNumber: true,
									image: true,
								},
							},
						},
					},
				},
			});

		if (!assignment || assignment.deletedAt) {
			throw new NotFoundException('Atribuição não encontrada');
		}

		return assignment;
	}

	async update(id: string, dto: UpdateTripAssignmentDto) {
		const assignment =
			await this.prisma.client.tripAssignment.findUnique({
				where: { id },
			});

		if (!assignment || assignment.deletedAt) {
			throw new NotFoundException('Atribuição não encontrada');
		}

		if (dto.status === assignment.status) {
			throw new BadRequestException(
				`O estado já está definido como ${dto.status}`,
			);
		}

		const updated =
			await this.prisma.client.tripAssignment.update({
				where: { id },
				data: { status: dto.status },
				select: defaultAssignmentSelect,
			});

		this.logger.log(
			`TripAssignment ${id} status: ${assignment.status} -> ${dto.status}`,
			'TripAssignmentsService',
		);

		return updated;
	}

	async remove(id: string) {
		const assignment =
			await this.prisma.client.tripAssignment.findUnique({
				where: { id },
			});

		if (!assignment || assignment.deletedAt) {
			throw new NotFoundException('Atribuição não encontrada');
		}

		await this.prisma.client.tripAssignment.update({
			where: { id },
			data: { deletedAt: new Date() },
		});

		this.logger.log(
			`TripAssignment ${id} soft-deleted`,
			'TripAssignmentsService',
		);

		return {
			msg: 'Atribuição removida com sucesso',
		};
	}
}
