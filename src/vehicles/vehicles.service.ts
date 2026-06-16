import {
	Injectable,
	NotFoundException,
	BadRequestException,
	ConflictException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { LoggerService } from '../logger/logger.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { ListVehiclesDto } from './dto/list-vehicles.dto';
import { UpdateVehicleStatusDto } from './dto/update-vehicle-status.dto';
import { UpdateVehicleUrlDto } from './dto/update-vehicle-url.dto';

const defaultVehicleSelect = {
	id: true,
	driverId: true,
	plateNumber: true,
	brand: true,
	model: true,
	year: true,
	color: true,
	type: true,
	photoUrl: true,
	documentUrl: true,
	insuranceUrl: true,
	inspectionExpiresAt: true,
	status: true,
	createdAt: true,
	deletedAt: true,
} as const;

@Injectable()
export class VehiclesService {
	constructor(
		private prisma: PrismaService,
		private cloudinary: CloudinaryService,
		private logger: LoggerService,
	) {}

	async create(dto: CreateVehicleDto) {
		const driver = await this.prisma.client.driver.findUnique({
			where: { id: dto.driverId },
		});

		if (!driver || driver.deletedAt) {
			throw new NotFoundException('Motorista não encontrado');
		}

		const existing = await this.prisma.client.vehicle.findUnique({
			where: { plateNumber: dto.plateNumber },
		});

		if (existing) {
			throw new ConflictException('Esta matrícula já está registada');
		}

		const vehicle = await this.prisma.client.vehicle.create({
			data: {
				id: uuidv7(),
				driverId: dto.driverId,
				plateNumber: dto.plateNumber,
				brand: dto.brand,
				model: dto.model,
				year: dto.year,
				color: dto.color,
				type: dto.type,
				photoUrl: dto.photoUrl,
				documentUrl: dto.documentUrl,
				insuranceUrl: dto.insuranceUrl,
				inspectionExpiresAt: dto.inspectionExpiresAt
					? new Date(dto.inspectionExpiresAt)
					: undefined,
			},
			select: defaultVehicleSelect,
		});

		await this.prisma.client.driver.update({
			where: { id: dto.driverId },
			data: { activeVehicleId: vehicle.id },
		});

		this.logger.log(
			`Vehicle ${vehicle.plateNumber} created and set as active for driver ${dto.driverId}`,
			'VehiclesService',
		);

		return vehicle;
	}

	async list(dto: ListVehiclesDto) {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 20;
		const skip = (page - 1) * limit;

		const where: Record<string, unknown> = {};

		if (!dto.includeDeleted) {
			where.deletedAt = null;
		}

		if (dto.search) {
			where.plateNumber = { contains: dto.search, mode: 'insensitive' };
		}

		if (dto.status) {
			where.status = dto.status;
		}

		if (dto.type) {
			where.type = dto.type;
		}

		if (dto.driverId) {
			where.driverId = dto.driverId;
		}

		const orderBy: Record<string, string> = {};
		orderBy[dto.sortBy ?? 'createdAt'] = dto.sortOrder ?? 'desc';

		const [vehicles, total] = await Promise.all([
			this.prisma.client.vehicle.findMany({
				where,
				skip,
				take: limit,
				orderBy,
				select: {
					...defaultVehicleSelect,
					driver: {
						select: {
							id: true,
							biNumber: true,
							licenseNumber: true,
							user: {
								select: {
									name: true,
									surname: true,
									phoneNumber: true,
								},
							},
						},
					},
				},
			}),
			this.prisma.client.vehicle.count({ where }),
		]);

		return {
			vehicles,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findById(id: string) {
		const vehicle = await this.prisma.client.vehicle.findUnique({
			where: { id },
			select: {
				...defaultVehicleSelect,
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
							},
						},
					},
				},
			},
		});

		if (!vehicle) {
			throw new NotFoundException('Veículo não encontrado');
		}

		return vehicle;
	}

	async update(id: string, dto: UpdateVehicleDto) {
		const vehicle = await this.prisma.client.vehicle.findUnique({
			where: { id },
		});

		if (!vehicle || vehicle.deletedAt) {
			throw new NotFoundException('Veículo não encontrado');
		}

		if (dto.plateNumber && dto.plateNumber !== vehicle.plateNumber) {
			const existing = await this.prisma.client.vehicle.findUnique({
				where: { plateNumber: dto.plateNumber },
			});
			if (existing) {
				throw new ConflictException('Esta matrícula já está em uso');
			}
		}

		const data: Record<string, unknown> = {};

		if (dto.driverId !== undefined) data.driverId = dto.driverId;
		if (dto.plateNumber !== undefined) data.plateNumber = dto.plateNumber;
		if (dto.brand !== undefined) data.brand = dto.brand;
		if (dto.model !== undefined) data.model = dto.model;
		if (dto.year !== undefined) data.year = dto.year;
		if (dto.color !== undefined) data.color = dto.color;
		if (dto.type !== undefined) data.type = dto.type;
		if (dto.photoUrl !== undefined) data.photoUrl = dto.photoUrl;
		if (dto.documentUrl !== undefined) data.documentUrl = dto.documentUrl;
		if (dto.insuranceUrl !== undefined)
			data.insuranceUrl = dto.insuranceUrl;
		if (dto.inspectionExpiresAt !== undefined) {
			data.inspectionExpiresAt = dto.inspectionExpiresAt
				? new Date(dto.inspectionExpiresAt)
				: null;
		}

		if (Object.keys(data).length === 0) {
			throw new BadRequestException('Nenhum dado para atualizar');
		}

		const updated = await this.prisma.client.vehicle.update({
			where: { id },
			data,
			select: defaultVehicleSelect,
		});

		this.logger.log(
			`Vehicle ${updated.plateNumber} updated`,
			'VehiclesService',
		);

		return updated;
	}

	async remove(id: string) {
		const vehicle = await this.prisma.client.vehicle.findUnique({
			where: { id },
		});

		if (!vehicle || vehicle.deletedAt) {
			throw new NotFoundException('Veículo não encontrado');
		}

		await this.prisma.client.vehicle.update({
			where: { id },
			data: { deletedAt: new Date() },
		});

		if (vehicle.status === 'ACTIVE') {
			const driver = await this.prisma.client.driver.findFirst({
				where: { activeVehicleId: id },
				select: { id: true },
			});
			if (driver) {
				await this.prisma.client.driver.update({
					where: { id: driver.id },
					data: { activeVehicleId: null },
				});
			}
		}

		this.logger.log(
			`Vehicle ${vehicle.plateNumber} soft-deleted`,
			'VehiclesService',
		);

		return {
			msg: 'Veículo removido com sucesso',
		};
	}

	async updateStatus(id: string, dto: UpdateVehicleStatusDto) {
		const vehicle = await this.prisma.client.vehicle.findUnique({
			where: { id },
		});

		if (!vehicle || vehicle.deletedAt) {
			throw new NotFoundException('Veículo não encontrado');
		}

		if (dto.status === vehicle.status) {
			throw new BadRequestException(
				`O estado já está definido como ${dto.status}`,
			);
		}

		const updated = await this.prisma.client.vehicle.update({
			where: { id },
			data: { status: dto.status },
			select: defaultVehicleSelect,
		});

		if (dto.status === 'ACTIVE') {
			await this.prisma.client.driver.update({
				where: { id: vehicle.driverId },
				data: { activeVehicleId: id },
			});
			this.logger.log(
				`Vehicle ${vehicle.plateNumber} activated and set as active for driver ${vehicle.driverId}`,
				'VehiclesService',
			);
		} else if (vehicle.status === 'ACTIVE') {
			const driver = await this.prisma.client.driver.findFirst({
				where: { activeVehicleId: id },
				select: { id: true },
			});
			if (driver) {
				await this.prisma.client.driver.update({
					where: { id: driver.id },
					data: { activeVehicleId: null },
				});
			}
			this.logger.log(
				`Vehicle ${vehicle.plateNumber} deactivated, cleared from driver ${vehicle.driverId}`,
				'VehiclesService',
			);
		}

		return updated;
	}

	async updatePhoto(id: string, dto: UpdateVehicleUrlDto) {
		const vehicle = await this.prisma.client.vehicle.findUnique({
			where: { id },
		});

		if (!vehicle || vehicle.deletedAt) {
			throw new NotFoundException('Veículo não encontrado');
		}

		if (vehicle.photoUrl) {
			const publicId = this.cloudinary.extractPublicId(vehicle.photoUrl);
			if (publicId) {
				await this.cloudinary.deleteResource(publicId).catch(() => {});
			}
		}

		const updated = await this.prisma.client.vehicle.update({
			where: { id },
			data: { photoUrl: dto.url },
			select: defaultVehicleSelect,
		});

		return updated;
	}

	async updateDocument(id: string, dto: UpdateVehicleUrlDto) {
		const vehicle = await this.prisma.client.vehicle.findUnique({
			where: { id },
		});

		if (!vehicle || vehicle.deletedAt) {
			throw new NotFoundException('Veículo não encontrado');
		}

		if (vehicle.documentUrl) {
			const publicId = this.cloudinary.extractPublicId(
				vehicle.documentUrl,
			);
			if (publicId) {
				await this.cloudinary.deleteResource(publicId).catch(() => {});
			}
		}

		const updated = await this.prisma.client.vehicle.update({
			where: { id },
			data: { documentUrl: dto.url },
			select: defaultVehicleSelect,
		});

		return updated;
	}

	async updateInsurance(id: string, dto: UpdateVehicleUrlDto) {
		const vehicle = await this.prisma.client.vehicle.findUnique({
			where: { id },
		});

		if (!vehicle || vehicle.deletedAt) {
			throw new NotFoundException('Veículo não encontrado');
		}

		if (vehicle.insuranceUrl) {
			const publicId = this.cloudinary.extractPublicId(
				vehicle.insuranceUrl,
			);
			if (publicId) {
				await this.cloudinary.deleteResource(publicId).catch(() => {});
			}
		}

		const updated = await this.prisma.client.vehicle.update({
			where: { id },
			data: { insuranceUrl: dto.url },
			select: defaultVehicleSelect,
		});

		return updated;
	}
}
