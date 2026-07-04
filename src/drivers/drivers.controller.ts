import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	Param,
	Body,
	Query,
	Req,
	UseGuards,
	ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { ListDriversDto } from './dto/list-drivers.dto';
import { UpdateComplianceDto } from './dto/update-compliance.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { UpdateDocumentStatusDto } from './dto/update-document-status.dto';

@ApiTags('Drivers')
@Controller('drivers')
export class DriversController {
	constructor(private driversService: DriversService) {}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Meu perfil',
		description: 'Retorna o perfil do motorista autenticado',
	})
	@UseGuards(JwtAuthGuard)
	@Get('me')
	async findMe(@Req() req: Request) {
		const user = req.user as { id: string };
		const driver = await this.driversService.findByUserId(user.id);
		return this.driversService.findById(driver.id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Meus documentos',
		description: 'Lista os documentos do motorista autenticado',
	})
	@UseGuards(JwtAuthGuard)
	@Get('me/documents')
	async listMyDocuments(@Req() req: Request) {
		const user = req.user as { id: string };
		const driver = await this.driversService.findByUserId(user.id);
		return this.driversService.listDocuments(driver.id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Upload meu documento',
		description: 'Adiciona um documento ao motorista autenticado',
	})
	@UseGuards(JwtAuthGuard)
	@Post('me/documents')
	async uploadMyDocument(
		@Req() req: Request,
		@Body(ValidationPipe) dto: UploadDocumentDto,
	) {
		const user = req.user as { id: string };
		const driver = await this.driversService.findByUserId(user.id);
		return this.driversService.uploadDocument(driver.id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover meu documento',
		description: 'Remove um documento do motorista autenticado',
	})
	@UseGuards(JwtAuthGuard)
	@Delete('me/documents/:documentId')
	async deleteMyDocument(
		@Req() req: Request,
		@Param('documentId') documentId: string,
	) {
		const user = req.user as { id: string };
		const driver = await this.driversService.findByUserId(user.id);
		return this.driversService.deleteDocument(driver.id, documentId);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Criar motorista',
		description:
			'Cria um perfil de motorista e atualiza role do user para DRIVER',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Post()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	create(@Body(ValidationPipe) dto: CreateDriverDto) {
		return this.driversService.create(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar motoristas',
		description: 'Lista todos os motoristas com paginação e filtros',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Get()
	@Roles(
		UserRole.SUPER_ADMIN,
		UserRole.OPERATIONS,
		UserRole.SUPPORT,
		UserRole.FINANCE,
	)
	list(@Query(ValidationPipe) dto: ListDriversDto) {
		return this.driversService.list(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter motorista',
		description: 'Retorna os dados de um motorista específico',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Get(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	findById(@Param('id') id: string) {
		return this.driversService.findById(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar motorista',
		description: 'Atualiza os dados de um motorista',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Patch(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	update(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateDriverDto,
	) {
		return this.driversService.update(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover motorista',
		description: 'Remove (soft delete) um motorista (apenas SUPER_ADMIN)',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Delete(':id')
	@Roles(UserRole.SUPER_ADMIN)
	remove(@Param('id') id: string) {
		return this.driversService.remove(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Alterar conformidade',
		description:
			'Altera o estado de conformidade do motorista (aprovar/rejeitar/suspender)',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Patch(':id/compliance')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.VALIDATOR)
	updateCompliance(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateComplianceDto,
	) {
		return this.driversService.updateCompliance(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Alterar disponibilidade',
		description: 'Altera a disponibilidade do próprio motorista',
	})
	@UseGuards(JwtAuthGuard)
	@Patch('me/availability')
	updateAvailability(
		@Req() req: Request,
		@Body(ValidationPipe) dto: UpdateAvailabilityDto,
	) {
		const user = req.user as { id: string };
		return this.driversService
			.findByUserId(user.id)
			.then((driver) =>
				this.driversService.updateAvailability(driver.id, dto),
			);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Estatísticas',
		description: 'Retorna estatísticas do motorista',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Get(':id/stats')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.FINANCE)
	getStats(@Param('id') id: string) {
		return this.driversService.getStats(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter localização',
		description: 'Retorna a última localização do motorista',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Get(':id/location')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	getLocation(@Param('id') id: string) {
		return this.driversService.getLocation(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar localização',
		description: 'Atualiza a localização do motorista (rate limit: 6/min)',
	})
	@Throttle({ default: { limit: 6, ttl: 60000 } })
	@UseGuards(JwtAuthGuard)
	@Patch('me/location')
	updateLocation(
		@Req() req: Request,
		@Body(ValidationPipe) dto: UpdateLocationDto,
	) {
		const user = req.user as { id: string };
		return this.driversService
			.findByUserId(user.id)
			.then((driver) =>
				this.driversService.updateLocation(driver.id, dto),
			);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Upload de documento',
		description:
			'Adiciona um documento ao motorista (fileUrl do Cloudinary)',
	})
	@UseGuards(JwtAuthGuard)
	@Post(':id/documents')
	async uploadDocument(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UploadDocumentDto,
	) {
		return this.driversService.uploadDocument(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar documentos',
		description: 'Lista os documentos do motorista',
	})
	@UseGuards(JwtAuthGuard)
	@Get(':id/documents')
	listDocuments(@Param('id') id: string) {
		return this.driversService.listDocuments(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter documento',
		description: 'Retorna um documento específico',
	})
	@UseGuards(JwtAuthGuard)
	@Get(':id/documents/:documentId')
	getDocument(
		@Param('id') id: string,
		@Param('documentId') documentId: string,
	) {
		return this.driversService.getDocument(id, documentId);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Aprovar/rejeitar documento',
		description: 'Altera o estado de um documento (VALIDATOR, ADMIN)',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Patch(':id/documents/:documentId/status')
	@Roles(UserRole.SUPER_ADMIN, UserRole.VALIDATOR)
	updateDocumentStatus(
		@Param('id') id: string,
		@Param('documentId') documentId: string,
		@Body(ValidationPipe) dto: UpdateDocumentStatusDto,
	) {
		return this.driversService.updateDocumentStatus(id, documentId, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover documento',
		description: 'Remove um documento e apaga o ficheiro do Cloudinary',
	})
	@UseGuards(JwtAuthGuard)
	@Delete(':id/documents/:documentId')
	async deleteDocument(
		@Param('id') id: string,
		@Param('documentId') documentId: string,
	) {
		return this.driversService.deleteDocument(id, documentId);
	}
}
