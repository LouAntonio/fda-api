import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SignatureDto {
	@ApiPropertyOptional({ description: 'Pasta de upload no Cloudinary' })
	@IsString()
	@IsOptional()
	folder?: string;
}
