import {
	Injectable,
	NotFoundException,
	BadRequestException,
	ConflictException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreateDeliveryDetailsDto } from './dto/create-delivery-details.dto';
import { UpdateDeliveryDetailsDto } from './dto/update-delivery-details.dto';

const defaultDeliveryDetailsSelect = {
	id: true,
	tripId: true,
	receiverName: true,
	receiverPhone: true,
	packageType: true,
	notes: true,
	metadata: true,
	createdAt: true,
	updatedAt: true,
} as const;

@Injectable()
export class DeliveryDetailsService {
	constructor(
		private prisma: PrismaService,
		private logger: LoggerService,
	) {}

	async create(dto: CreateDeliveryDetailsDto) {
		const trip = await this.prisma.client.trip.findUnique({
			where: { id: dto.tripId },
			select: { id: true },
		});

		if (!trip) {
			throw new NotFoundException('Viagem não encontrada');
		}

		const existing = await this.prisma.client.deliveryDetails.findUnique({
			where: { tripId: dto.tripId },
		});

		if (existing) {
			throw new ConflictException(
				'Esta viagem já possui detalhes de entrega',
			);
		}

		const details = await this.prisma.client.deliveryDetails.create({
			data: {
				id: uuidv7(),
				tripId: dto.tripId,
				receiverName: dto.receiverName,
				receiverPhone: dto.receiverPhone,
				packageType: dto.packageType,
				notes: dto.notes ?? null,
				metadata:
					(dto.metadata as unknown as
						| Prisma.NullableJsonNullValueInput
						| Prisma.InputJsonValue) ?? Prisma.JsonNull,
			},
			select: defaultDeliveryDetailsSelect,
		});

		this.logger.log(
			`DeliveryDetails ${details.id} created for trip ${dto.tripId}`,
			'DeliveryDetailsService',
		);

		return details;
	}

	async findById(id: string) {
		const details = await this.prisma.client.deliveryDetails.findUnique({
			where: { id },
			select: {
				...defaultDeliveryDetailsSelect,
				trip: {
					select: {
						id: true,
						status: true,
						clientId: true,
					},
				},
			},
		});

		if (!details) {
			throw new NotFoundException('Detalhes de entrega não encontrados');
		}

		return details;
	}

	async findByTripId(tripId: string) {
		const details = await this.prisma.client.deliveryDetails.findUnique({
			where: { tripId },
			select: {
				...defaultDeliveryDetailsSelect,
				trip: {
					select: {
						id: true,
						status: true,
						clientId: true,
					},
				},
			},
		});

		if (!details) {
			throw new NotFoundException(
				'Detalhes de entrega não encontrados para esta viagem',
			);
		}

		return details;
	}

	async update(id: string, dto: UpdateDeliveryDetailsDto) {
		const details = await this.prisma.client.deliveryDetails.findUnique({
			where: { id },
		});

		if (!details) {
			throw new NotFoundException('Detalhes de entrega não encontrados');
		}

		const data: Record<string, unknown> = {};

		if (dto.receiverName !== undefined)
			data.receiverName = dto.receiverName;
		if (dto.receiverPhone !== undefined)
			data.receiverPhone = dto.receiverPhone;
		if (dto.packageType !== undefined) data.packageType = dto.packageType;
		if (dto.notes !== undefined) data.notes = dto.notes;
		if (dto.metadata !== undefined) data.metadata = dto.metadata;

		if (Object.keys(data).length === 0) {
			throw new BadRequestException('Nenhum dado para atualizar');
		}

		const updated = await this.prisma.client.deliveryDetails.update({
			where: { id },
			data,
			select: defaultDeliveryDetailsSelect,
		});

		this.logger.log(
			`DeliveryDetails ${id} updated`,
			'DeliveryDetailsService',
		);

		return updated;
	}

	async remove(id: string) {
		const details = await this.prisma.client.deliveryDetails.findUnique({
			where: { id },
		});

		if (!details) {
			throw new NotFoundException('Detalhes de entrega não encontrados');
		}

		await this.prisma.client.deliveryDetails.delete({
			where: { id },
		});

		this.logger.log(
			`DeliveryDetails ${id} deleted`,
			'DeliveryDetailsService',
		);

		return {
			msg: 'Detalhes de entrega removidos com sucesso',
		};
	}
}
