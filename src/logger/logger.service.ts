import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(
	({
		timestamp,
		level,
		message,
		context,
		...meta
	}: Record<string, unknown>) => {
		const ctx = typeof context === 'string' ? `[${context}] ` : '';
		const metaStr = Object.keys(meta).length
			? ` ${JSON.stringify(meta)}`
			: '';
		return `${String(timestamp)} ${ctx}${String(level)}: ${String(message)}${metaStr}`;
	},
);

const datePattern = 'DD-MM-YYYY';

@Injectable()
export class LoggerService implements NestLoggerService {
	private logger: winston.Logger;

	constructor() {
		this.logger = winston.createLogger({
			level: 'info',
			format: combine(
				timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
				logFormat,
			),
			transports: [
				new winston.transports.DailyRotateFile({
					filename: 'logs/all-%DATE%.txt',
					datePattern,
					level: 'info',
					maxFiles: '30d',
					format: combine(
						timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
						logFormat,
					),
				}),
				new winston.transports.DailyRotateFile({
					filename: 'logs/error-%DATE%.txt',
					datePattern,
					level: 'error',
					maxFiles: '30d',
					format: combine(
						timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
						logFormat,
					),
				}),
			],
		});

		if (process.env.NODE_ENV !== 'production') {
			this.logger.add(
				new winston.transports.Console({
					format: combine(
						colorize(),
						timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
						logFormat,
					),
				}),
			);
		}
	}

	log(message: unknown, context?: string) {
		this.logger.info(String(message), { context });
	}

	error(message: unknown, trace?: string, context?: string) {
		this.logger.error(String(message), { trace, context });
	}

	warn(message: unknown, context?: string) {
		this.logger.warn(String(message), { context });
	}

	debug?(message: unknown, context?: string) {
		this.logger.debug(String(message), { context });
	}

	verbose?(message: unknown, context?: string) {
		this.logger.verbose(String(message), { context });
	}

	fatal?(message: unknown, ...optionalParams: unknown[]) {
		const ctx = optionalParams[0];
		this.logger.error(String(message), {
			context: typeof ctx === 'string' ? ctx : undefined,
		});
	}
}
