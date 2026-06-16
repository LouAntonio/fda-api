import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
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
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ListReviewsDto } from './dto/list-reviews.dto';

@ApiTags('Avaliações')
@Controller('reviews')
export class ReviewsController {
	constructor(private reviewsService: ReviewsService) {}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Criar avaliação',
		description: 'Cria uma avaliação para uma viagem concluída',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Post()
	@Roles(UserRole.CLIENT, UserRole.DRIVER, UserRole.SUPER_ADMIN)
	create(@Body(ValidationPipe) dto: CreateReviewDto) {
		return this.reviewsService.create(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Listar avaliações',
		description: 'Lista avaliações com paginação e filtros',
	})
	@UseGuards(JwtAuthGuard)
	@Get()
	list(@Query(ValidationPipe) dto: ListReviewsDto) {
		return this.reviewsService.list(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Obter avaliação',
		description: 'Retorna os dados de uma avaliação específica',
	})
	@UseGuards(JwtAuthGuard)
	@Get(':id')
	findById(@Param('id') id: string) {
		return this.reviewsService.findById(id);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Atualizar avaliação',
		description: 'Atualiza a classificação e/ou comentário',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Patch(':id')
	@Roles(UserRole.SUPER_ADMIN)
	update(
		@Param('id') id: string,
		@Body(ValidationPipe) dto: UpdateReviewDto,
	) {
		return this.reviewsService.update(id, dto);
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Remover avaliação',
		description: 'Remove (soft delete) uma avaliação',
	})
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Delete(':id')
	@Roles(UserRole.SUPER_ADMIN)
	remove(@Param('id') id: string) {
		return this.reviewsService.remove(id);
	}
}
