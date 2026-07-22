import {
	Controller,
	Post,
	Delete,
	Body,
	UseGuards,
	Param,
	ValidationPipe,
	BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { SignatureDto } from './dto/signature.dto';

const ALLOWED_FOLDERS = [
	'FDA/vehicles',
	'FDA/documents',
	'FDA/profiles',
	'FDA/invoices',
	'FDA/events',
];

const FOLDER_MIME_MAP: Record<string, string[]> = {
	'FDA/profiles': ['jpg', 'jpeg', 'png'],
	'FDA/vehicles': ['jpg', 'jpeg', 'png'],
	'FDA/documents': ['jpg', 'jpeg', 'png', 'pdf'],
	'FDA/invoices': ['jpg', 'jpeg', 'png', 'pdf'],
	'FDA/events': ['jpg', 'jpeg', 'png'],
};

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
	constructor(private cloudinary: CloudinaryService) {}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Gerar assinatura de upload',
		description: 'Gera uma assinatura para upload direto para o Cloudinary',
	})
	@ApiBody({ schema: { example: { folder: 'FDA/events' } } })
	@UseGuards(JwtAuthGuard)
	@Post('signature')
	getSignature(@Body(ValidationPipe) dto: SignatureDto) {
		const rawFolder = dto.folder?.replace(/^[^/]+/, (m) => m.toUpperCase());
		if (rawFolder && !ALLOWED_FOLDERS.includes(rawFolder)) {
			throw new BadRequestException(
				`Pasta não permitida. Pastas válidas: ${ALLOWED_FOLDERS.join(', ')}`,
			);
		}

		const resolvedFolder = dto.folder ?? 'FDA/events';
		const allowedFormats = FOLDER_MIME_MAP[resolvedFolder] ?? [
			'jpg',
			'jpeg',
			'png',
		];

		const data = this.cloudinary.getUploadSignature(
			resolvedFolder,
			allowedFormats,
		);

		return {
			msg: 'Assinatura de upload gerada com sucesso',
			data,
		};
	}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Eliminar recurso',
		description: 'Elimina um recurso do Cloudinary pelo publicId',
	})
	@UseGuards(JwtAuthGuard)
	@Delete(':publicId')
	async deleteResource(@Param('publicId') publicId: string) {
		return this.cloudinary.deleteResource(publicId);
	}
}
