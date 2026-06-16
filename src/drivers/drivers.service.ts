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
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { ListDriversDto } from './dto/list-drivers.dto';
import { UpdateComplianceDto } from './dto/update-compliance.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { UpdateDocumentStatusDto } from './dto/update-document-status.dto';
import { coordsToWkt } from '../common/helpers/coords.helper';

const defaultDriverSelect = {
	id: true,
	userId: true,
	complianceStatus: true,
	availability: true,
	biNumber: true,
	licenseNumber: true,
	ratingAverage: true,
	ratingCount: true,
	completedTripsCount: true,
	cancelledTripsCount: true,
	availableBalance: true,
	pendingBalance: true,
	lastLocationAt: true,
	activeVehicleId: true,
	fleetId: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
} as const;

@Injectable()
export class DriversService {
	constructor(
		private prisma: PrismaService,
		private cloudinary: CloudinaryService,
		private logger: LoggerService,
	) {}

	async create(dto: CreateDriverDto) {
		const user = await this.prisma.client.user.findUnique({
			where: { id: dto.userId },
		});

		if (!user || user.deletedAt) {
			throw new NotFoundException('Utilizador não encontrado');
		}

		const existingDriver = await this.prisma.client.driver.findUnique({
			where: { userId: dto.userId },
		});

		if (existingDriver) {
			throw new ConflictException(
				'Este utilizador já possui um perfil de motorista',
			);
		}

		const existingBi = await this.prisma.client.driver.findUnique({
			where: { biNumber: dto.biNumber },
		});

		if (existingBi) {
			throw new ConflictException('Este BI já está registado');
		}

		const existingLicense = await this.prisma.client.driver.findUnique({
			where: { licenseNumber: dto.licenseNumber },
		});

		if (existingLicense) {
			throw new ConflictException(
				'Esta carta de condução já está registada',
			);
		}

		const driver = await this.prisma.client.driver.create({
			data: {
				id: uuidv7(),
				userId: dto.userId,
				biNumber: dto.biNumber,
				licenseNumber: dto.licenseNumber,
			},
		});

		await this.prisma.client.user.update({
			where: { id: dto.userId },
			data: { role: 'DRIVER' },
		});

		this.logger.log(
			`Driver profile created for user ${dto.userId}`,
			'DriversService',
		);

		return driver;
	}

	async list(dto: ListDriversDto) {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 20;
		const skip = (page - 1) * limit;

		const where: Record<string, unknown> = {};

		if (!dto.includeDeleted) {
			where.deletedAt = null;
		}

		if (dto.search) {
			where.OR = [
				{ biNumber: { contains: dto.search, mode: 'insensitive' } },
				{
					licenseNumber: {
						contains: dto.search,
						mode: 'insensitive',
					},
				},
				{
					user: {
						name: { contains: dto.search, mode: 'insensitive' },
					},
				},
			];
		}

		if (dto.complianceStatus) {
			where.complianceStatus = dto.complianceStatus;
		}

		if (dto.availability) {
			where.availability = dto.availability;
		}

		const orderBy: Record<string, string> = {};
		orderBy[dto.sortBy ?? 'createdAt'] = dto.sortOrder ?? 'desc';

		const [drivers, total] = await Promise.all([
			this.prisma.client.driver.findMany({
				where,
				skip,
				take: limit,
				orderBy,
				select: {
					...defaultDriverSelect,
					user: {
						select: {
							id: true,
							name: true,
							surname: true,
							email: true,
							phoneNumber: true,
							image: true,
						},
					},
				},
			}),
			this.prisma.client.driver.count({ where }),
		]);

		return {
			drivers,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async findById(id: string) {
		const driver = await this.prisma.client.driver.findUnique({
			where: { id },
			select: {
				...defaultDriverSelect,
				user: {
					select: {
						id: true,
						name: true,
						surname: true,
						email: true,
						phoneNumber: true,
						image: true,
						role: true,
					},
				},
				vehicles: true,
				fleet: true,
				documents: true,
				locations: true,
			},
		});

		if (!driver) {
			throw new NotFoundException('Motorista não encontrado');
		}

		return driver;
	}

	async findByUserId(userId: string) {
		const driver = await this.prisma.client.driver.findUnique({
			where: { userId },
		});

		if (!driver || driver.deletedAt) {
			throw new NotFoundException('Perfil de motorista não encontrado');
		}

		return driver;
	}

	async update(id: string, dto: UpdateDriverDto) {
		const driver = await this.prisma.client.driver.findUnique({
			where: { id },
		});

		if (!driver || driver.deletedAt) {
			throw new NotFoundException('Motorista não encontrado');
		}

		if (dto.biNumber && dto.biNumber !== driver.biNumber) {
			const existing = await this.prisma.client.driver.findUnique({
				where: { biNumber: dto.biNumber },
			});
			if (existing) {
				throw new ConflictException('Este BI já está em uso');
			}
		}

		if (dto.licenseNumber && dto.licenseNumber !== driver.licenseNumber) {
			const existing = await this.prisma.client.driver.findUnique({
				where: { licenseNumber: dto.licenseNumber },
			});
			if (existing) {
				throw new ConflictException(
					'Esta carta de condução já está em uso',
				);
			}
		}

		const data: Record<string, unknown> = {};

		if (dto.biNumber !== undefined) data.biNumber = dto.biNumber;
		if (dto.licenseNumber !== undefined)
			data.licenseNumber = dto.licenseNumber;
		if (dto.activeVehicleId !== undefined)
			data.activeVehicleId = dto.activeVehicleId;
		if (dto.fleetId !== undefined) data.fleetId = dto.fleetId;

		if (Object.keys(data).length === 0) {
			throw new BadRequestException('Nenhum dado para atualizar');
		}

		const updated = await this.prisma.client.driver.update({
			where: { id },
			data,
			select: defaultDriverSelect,
		});

		this.logger.log(`Driver ${id} updated`, 'DriversService');

		return updated;
	}

	async remove(id: string) {
		const driver = await this.prisma.client.driver.findUnique({
			where: { id },
		});

		if (!driver || driver.deletedAt) {
			throw new NotFoundException('Motorista não encontrado');
		}

		await this.prisma.client.driver.update({
			where: { id },
			data: { deletedAt: new Date() },
		});

		this.logger.log(`Driver ${id} soft-deleted`, 'DriversService');

		return {
			msg: 'Motorista removido com sucesso',
		};
	}

	async updateCompliance(id: string, dto: UpdateComplianceDto) {
		const driver = await this.prisma.client.driver.findUnique({
			where: { id },
		});

		if (!driver || driver.deletedAt) {
			throw new NotFoundException('Motorista não encontrado');
		}

		if (dto.complianceStatus === driver.complianceStatus) {
			throw new BadRequestException(
				`O estado já está definido como ${dto.complianceStatus}`,
			);
		}

		const updated = await this.prisma.client.driver.update({
			where: { id },
			data: { complianceStatus: dto.complianceStatus },
			select: defaultDriverSelect,
		});

		this.logger.log(
			`Driver ${id} compliance changed to ${dto.complianceStatus}${dto.motive ? `: ${dto.motive}` : ''}`,
			'DriversService',
		);

		return updated;
	}

	async updateAvailability(driverId: string, dto: UpdateAvailabilityDto) {
		const driver = await this.prisma.client.driver.findUnique({
			where: { id: driverId },
		});

		if (!driver || driver.deletedAt) {
			throw new NotFoundException('Motorista não encontrado');
		}

		const data: Record<string, unknown> = {
			availability: dto.availability,
		};

		if (dto.availability === 'ONLINE') {
			data.lastLocationAt = new Date();
		}

		const updated = await this.prisma.client.driver.update({
			where: { id: driverId },
			data,
			select: defaultDriverSelect,
		});

		return updated;
	}

	async getStats(id: string) {
		const driver = await this.prisma.client.driver.findUnique({
			where: { id },
			select: {
				ratingAverage: true,
				ratingCount: true,
				completedTripsCount: true,
				cancelledTripsCount: true,
				availableBalance: true,
				pendingBalance: true,
			},
		});

		if (!driver) {
			throw new NotFoundException('Motorista não encontrado');
		}

		return driver;
	}

	async getLocation(driverId: string) {
		const driver = await this.prisma.client.driver.findUnique({
			where: { id: driverId },
			select: { id: true, deletedAt: true },
		});

		if (!driver || driver.deletedAt) {
			throw new NotFoundException('Motorista não encontrado');
		}

		const location = await this.prisma.client.driverLocation.findUnique({
			where: { driverId },
		});

		if (!location) {
			throw new NotFoundException(
				'Localização não disponível para este motorista',
			);
		}

		return location;
	}

	async updateLocation(driverId: string, dto: UpdateLocationDto) {
		const driver = await this.prisma.client.driver.findUnique({
			where: { id: driverId },
			select: { id: true, deletedAt: true },
		});

		if (!driver || driver.deletedAt) {
			throw new NotFoundException('Motorista não encontrado');
		}

		/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
		const location = await (
			this.prisma.client.driverLocation as any
		).upsert({
			where: { driverId },
			update: {
				location: coordsToWkt(dto.lat, dto.lng),
				heading: dto.heading,
				speed: dto.speed,
				accuracy: dto.accuracy,
			},
			create: {
				driverId,
				location: coordsToWkt(dto.lat, dto.lng),
				heading: dto.heading,
				speed: dto.speed,
				accuracy: dto.accuracy,
			},
		});
		/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

		await this.prisma.client.driver.update({
			where: { id: driverId },
			data: { lastLocationAt: new Date() },
		});

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return location;
	}

	async uploadDocument(driverId: string, dto: UploadDocumentDto) {
		const driver = await this.prisma.client.driver.findUnique({
			where: { id: driverId },
			select: { id: true, deletedAt: true },
		});

		if (!driver || driver.deletedAt) {
			throw new NotFoundException('Motorista não encontrado');
		}

		const existingPending =
			await this.prisma.client.driverDocument.findFirst({
				where: {
					driverId,
					type: dto.type,
					status: 'PENDING',
				},
			});

		if (existingPending) {
			throw new ConflictException(
				`Já existe um documento do tipo "${dto.type}" pendente de aprovação`,
			);
		}

		const document = await this.prisma.client.driverDocument.create({
			data: {
				id: uuidv7(),
				driverId,
				type: dto.type,
				fileUrl: dto.fileUrl,
				expiryDate: dto.expiryDate
					? new Date(dto.expiryDate)
					: undefined,
			},
		});

		return document;
	}

	async listDocuments(driverId: string) {
		const driver = await this.prisma.client.driver.findUnique({
			where: { id: driverId },
			select: { id: true, deletedAt: true },
		});

		if (!driver || driver.deletedAt) {
			throw new NotFoundException('Motorista não encontrado');
		}

		const documents = await this.prisma.client.driverDocument.findMany({
			where: { driverId },
			orderBy: { createdAt: 'desc' },
		});

		return documents;
	}

	async getDocument(driverId: string, documentId: string) {
		const document = await this.prisma.client.driverDocument.findUnique({
			where: { id: documentId },
		});

		if (!document || document.driverId !== driverId) {
			throw new NotFoundException('Documento não encontrado');
		}

		return document;
	}

	async updateDocumentStatus(
		driverId: string,
		documentId: string,
		dto: UpdateDocumentStatusDto,
	) {
		const document = await this.prisma.client.driverDocument.findUnique({
			where: { id: documentId },
		});

		if (!document || document.driverId !== driverId) {
			throw new NotFoundException('Documento não encontrado');
		}

		if (document.status !== 'PENDING') {
			throw new BadRequestException('Este documento já foi processado');
		}

		const data: Record<string, unknown> = {
			status: dto.status,
		};

		if (dto.status === 'REJECTED' && dto.rejectionReason) {
			data.rejectionReason = dto.rejectionReason;
		}

		const updated = await this.prisma.client.driverDocument.update({
			where: { id: documentId },
			data,
		});

		this.logger.log(
			`Document ${documentId} for driver ${driverId} ${dto.status === 'APPROVED' ? 'approved' : `rejected: ${dto.rejectionReason ?? ''}`}`,
			'DriversService',
		);

		return updated;
	}

	async deleteDocument(driverId: string, documentId: string) {
		const document = await this.prisma.client.driverDocument.findUnique({
			where: { id: documentId },
		});

		if (!document || document.driverId !== driverId) {
			throw new NotFoundException('Documento não encontrado');
		}

		const publicId = this.cloudinary.extractPublicId(document.fileUrl);

		if (publicId) {
			await this.cloudinary.deleteResource(publicId).catch(() => {});
		}

		await this.prisma.client.driverDocument.delete({
			where: { id: documentId },
		});

		return {
			msg: 'Documento removido com sucesso',
		};
	}
}
