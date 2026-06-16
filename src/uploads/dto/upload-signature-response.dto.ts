import { ApiProperty } from '@nestjs/swagger';

export class UploadSignatureResponseDto {
	@ApiProperty({ description: 'Assinatura de upload' })
	signature!: string;

	@ApiProperty({ description: 'Timestamp da assinatura' })
	timestamp!: number;

	@ApiProperty({ description: 'Nome do cloud no Cloudinary' })
	cloudName!: string;

	@ApiProperty({ description: 'API Key do Cloudinary' })
	apiKey!: string;

	@ApiProperty({ description: 'Pasta de upload' })
	folder!: string;
}
