import {
	Injectable,
	NotFoundException,
	BadRequestException,
	ConflictException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreateFleetDto } from './dto/create-fleet.dto';
import { UpdateFleetDto } from './dto/update-fleet.dto';
import { ListFleetsDto } from './dto/list-fleets.dto';
import { AddDriverDto } from './dto/add-driver.dto';

const defaultFleetSelect = {
	id: true,
	ownerId: true,
	name: true,
	createdAt: true,
} as const;

@Injectable()
export class FleetsService {
	constructor(
		private prisma: PrismaService,
		private logger: LoggerService,
	) {}

	async create(dto: CreateFleetDto) {
		const owner = await this.prisma.client.user.findUnique({
			where: { id: dto.ownerId },
		});

		if (!owner || owner.deletedAt) {
			throw new NotFoundException('Proprietário não encontrado');
		}

		const fleet = await this.prisma.client.fleet.create({
			data: {
				id: uuidv7(),
				ownerId: dto.ownerId,
				name: dto.name,
			},
			select: defaultFleetSelect,
		});

		this.logger.log(
			`Fleet ${fleet.name} created by user ${dto.ownerId}`,
			'FleetsService',
		);

		return fleet;
	}

	async list(dto: ListFleetsDto) {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 20;
		const skip = (page - 1) * limit;

		const where: Record<string, unknown> = {};

		if (dto.search) {
			where.name = { contains: dto.search, mode: 'insensitive' };
		}

		if (dto.ownerId) {
			where.ownerId = dto.ownerId;
		}

		const orderBy = { createdAt: 'desc' as const };

		const [fleets, total] = await Promise.all([
			this.prisma.client.fleet.findMany({
				where,
				skip,
				take: limit,
				orderBy,
				select: {
					...defaultFleetSelect,
					owner: {
						select: {
							id: true,
							name: true,
							surname: true,
						},
					},
					_count: {
						select: { drivers: true },
					},
				},
			}),
			this.prisma.client.fleet.count({ where }),
		]);

		return {
			fleets,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findById(id: string) {
		const fleet = await this.prisma.client.fleet.findUnique({
			where: { id },
			select: {
				...defaultFleetSelect,
				owner: {
					select: {
						id: true,
						name: true,
						surname: true,
						email: true,
						phoneNumber: true,
					},
				},
				drivers: {
					select: {
						id: true,
						biNumber: true,
						licenseNumber: true,
						complianceStatus: true,
						availability: true,
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
		});

		if (!fleet) {
			throw new NotFoundException('Frota não encontrada');
		}

		return fleet;
	}

	async update(id: string, dto: UpdateFleetDto) {
		const fleet = await this.prisma.client.fleet.findUnique({
			where: { id },
		});

		if (!fleet) {
			throw new NotFoundException('Frota não encontrada');
		}

		if (!dto.name) {
			throw new BadRequestException('Nenhum dado para atualizar');
		}

		const updated = await this.prisma.client.fleet.update({
			where: { id },
			data: { name: dto.name },
			select: defaultFleetSelect,
		});

		this.logger.log(`Fleet ${updated.name} updated`, 'FleetsService');

		return updated;
	}

	async remove(id: string) {
		const fleet = await this.prisma.client.fleet.findUnique({
			where: { id },
		});

		if (!fleet) {
			throw new NotFoundException('Frota não encontrada');
		}

		await this.prisma.client.driver.updateMany({
			where: { fleetId: id },
			data: { fleetId: null },
		});

		await this.prisma.client.fleet.delete({
			where: { id },
		});

		this.logger.log(
			`Fleet ${fleet.name} removed, drivers unlinked`,
			'FleetsService',
		);

		return {
			msg: 'Frota removida com sucesso',
		};
	}

	async addDriver(fleetId: string, dto: AddDriverDto) {
		const fleet = await this.prisma.client.fleet.findUnique({
			where: { id: fleetId },
		});

		if (!fleet) {
			throw new NotFoundException('Frota não encontrada');
		}

		const driver = await this.prisma.client.driver.findUnique({
			where: { id: dto.driverId },
		});

		if (!driver || driver.deletedAt) {
			throw new NotFoundException('Motorista não encontrado');
		}

		if (driver.fleetId) {
			if (driver.fleetId === fleetId) {
				throw new ConflictException(
					'Este motorista já pertence a esta frota',
				);
			}
			throw new ConflictException(
				'Este motorista já pertence a outra frota',
			);
		}

		await this.prisma.client.driver.update({
			where: { id: dto.driverId },
			data: { fleetId },
		});

		this.logger.log(
			`Driver ${dto.driverId} added to fleet ${fleetId}`,
			'FleetsService',
		);

		return {
			msg: 'Motorista adicionado à frota com sucesso',
		};
	}

	async removeDriver(fleetId: string, driverId: string) {
		const driver = await this.prisma.client.driver.findUnique({
			where: { id: driverId },
		});

		if (!driver) {
			throw new NotFoundException('Motorista não encontrado');
		}

		if (driver.fleetId !== fleetId) {
			throw new BadRequestException(
				'Este motorista não pertence a esta frota',
			);
		}

		await this.prisma.client.driver.update({
			where: { id: driverId },
			data: { fleetId: null },
		});

		this.logger.log(
			`Driver ${driverId} removed from fleet ${fleetId}`,
			'FleetsService',
		);

		return {
			msg: 'Motorista removido da frota com sucesso',
		};
	}
}
