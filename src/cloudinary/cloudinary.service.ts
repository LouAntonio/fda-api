import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
	private readonly cloudName: string;
	private readonly apiKey: string;
	private readonly apiSecret: string;
	private readonly defaultFolder: string;

	constructor(private configService: ConfigService) {
		this.cloudName = this.configService.getOrThrow<string>(
			'CLOUDINARY_CLOUD_NAME',
		);
		this.apiKey =
			this.configService.getOrThrow<string>('CLOUDINARY_API_KEY');
		this.apiSecret = this.configService.getOrThrow<string>(
			'CLOUDINARY_API_SECRET',
		);
		this.defaultFolder =
			this.configService.get<string>('CLOUDINARY_UPLOAD_FOLDER') ?? 'FDA';

		cloudinary.config({
			cloud_name: this.cloudName,
			api_key: this.apiKey,
			api_secret: this.apiSecret,
		});
	}

	getUploadSignature(folder?: string, allowedFormats?: string[]) {
		const timestamp = Math.round(Date.now() / 1000);
		const folderPath = folder ?? this.defaultFolder;

		const params: Record<string, string | number> = {
			timestamp,
			folder: folderPath,
		};

		if (allowedFormats?.length) {
			params.allowed_formats = allowedFormats.join(',');
		}

		const signature = cloudinary.utils.api_sign_request(
			params,
			this.apiSecret,
		);

		return {
			signature,
			timestamp,
			cloudName: this.cloudName,
			apiKey: this.apiKey,
			folder: folderPath,
		};
	}

	async deleteResource(publicId: string) {
		try {
			const result = (await cloudinary.uploader.destroy(publicId)) as {
				result: string;
			};

			if (result.result !== 'ok') {
				throw new InternalServerErrorException(
					`Falha ao eliminar recurso: ${result.result}`,
				);
			}

			return { msg: 'Recurso eliminado com sucesso' };
		} catch (error) {
			if (error instanceof InternalServerErrorException) {
				throw error;
			}
			throw new InternalServerErrorException(
				'Erro ao eliminar recurso do Cloudinary',
			);
		}
	}

	extractPublicId(url: string): string | null {
		const regex = /\/upload\/(?:v\d+\/)?(.+?)\.(?:\w+)$/;
		const match = url.match(regex);
		return match ? match[1] : null;
	}
}
