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
		if (dto.folder && !ALLOWED_FOLDERS.includes(dto.folder)) {
			throw new BadRequestException(
				`Pasta não permitida. Pastas válidas: ${ALLOWED_FOLDERS.join(', ')}`,
			);
		}

		const data = this.cloudinary.getUploadSignature(
			dto.folder ?? 'FDA/events',
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
