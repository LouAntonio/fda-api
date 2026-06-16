import {
	Controller,
	Get,
	Post,
	Param,
	Body,
	Query,
	UseGuards,
	ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditLogsService } from './audit-logs.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

@ApiTags('Registo de Auditoria')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogsController {
	constructor(private auditLogsService: AuditLogsService) {}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Registar log',
		description: 'Regista manualmente uma entrada no registo de auditoria',
	})
	@Post()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS)
	create(@Body(ValidationPipe) dto: CreateAuditLogDto) {
		return this.auditLogsService.create(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar logs',
		description:
			'Lista entradas do registo de auditoria com paginação e filtros',
	})
	@Get()
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	list(@Query(ValidationPipe) dto: ListAuditLogsDto) {
		return this.auditLogsService.list(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter log',
		description:
			'Retorna os dados de uma entrada específica do registo de auditoria',
	})
	@Get(':id')
	@Roles(UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SUPPORT)
	findById(@Param('id') id: string) {
		return this.auditLogsService.findById(id);
	}
}
