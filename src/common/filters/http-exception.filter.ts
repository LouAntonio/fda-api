import {
	ExceptionFilter,
	Catch,
	ArgumentsHost,
	HttpException,
	HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoggerService } from '../../logger/logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	constructor(private readonly logger: LoggerService) {}

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		const status =
			exception instanceof HttpException
				? exception.getStatus()
				: HttpStatus.INTERNAL_SERVER_ERROR;

		const message =
			exception instanceof Error
				? exception.message
				: 'Erro interno do servidor';

		const body =
			status >= 400 && status < 500 && request.body
				? ` — Body: ${JSON.stringify(request.body)}`
				: '';

		if (status >= 500) {
			this.logger.error(
				`${request.method} ${request.originalUrl} ${status} — ${message}${body}`,
				exception instanceof Error ? exception.stack : undefined,
				'HttpExceptionFilter',
			);
		} else {
			this.logger.warn(
				`${request.method} ${request.originalUrl} ${status} — ${message}${body}`,
				'HttpExceptionFilter',
			);
		}

		let msg = 'Erro interno do servidor';

		if (exception instanceof HttpException) {
			const res = exception.getResponse();

			if (typeof res === 'string') {
				msg = res;
			} else if (typeof res === 'object' && res !== null) {
				const obj = res as Record<string, unknown>;
				const message = obj.message;
				if (Array.isArray(message)) {
					msg = message[0] as string;
				} else if (typeof message === 'string') {
					msg = message;
				} else if (typeof obj.msg === 'string') {
					msg = obj.msg;
				} else {
					msg = exception.message;
				}
			}
		} else if (exception instanceof Error) {
			msg = exception.message;
		}

		response.status(status).json({
			success: false,
			msg,
		});
	}
}
