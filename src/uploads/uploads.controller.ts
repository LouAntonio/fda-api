import {
	Controller,
	Post,
	Delete,
	Body,
	UseGuards,
	Param,
	ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { SignatureDto } from './dto/signature.dto';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
	constructor(private cloudinary: CloudinaryService) {}

	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Gerar assinatura de upload',
		description: 'Gera uma assinatura para upload direto para o Cloudinary',
	})
	@ApiBody({ schema: { example: { folder: 'eventos' } } })
	@UseGuards(JwtAuthGuard)
	@Post('signature')
	getSignature(@Body(ValidationPipe) dto: SignatureDto) {
		const data = this.cloudinary.getUploadSignature(dto.folder);

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
