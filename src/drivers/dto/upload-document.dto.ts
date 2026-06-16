import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadDocumentDto {
	@ApiProperty({
		example: 'license',
		description: 'Tipo de documento (ex: license, bi, insurance, photo)',
	})
	@IsString()
	type!: string;

	@ApiProperty({
		example: 'https://res.cloudinary.com/.../driver_license.jpg',
		description: 'URL do ficheiro no Cloudinary',
	})
	@IsString()
	fileUrl!: string;

	@ApiPropertyOptional({
		example: '2027-06-16T23:59:59.000Z',
		description: 'Data de expiração do documento',
	})
	@IsOptional()
	@IsDateString()
	expiryDate?: string;
}
