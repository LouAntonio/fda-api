import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerService } from './logger/logger.service';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	const logger = app.get(LoggerService);
	app.useLogger(logger);

	app.enableCors({
		origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
		credentials: true,
	});

	if (process.env.NODE_ENV !== 'production') {
		const swaggerConfig = new DocumentBuilder()
			.setTitle('Ticketzone API')
			.setDescription('API Ticketzone - Plataforma de venda de bilhetes')
			.setVersion('1.0.0')
			.addBearerAuth()
			.build();

		const document = SwaggerModule.createDocument(app, swaggerConfig);
		SwaggerModule.setup('docs', app, document);
	}

	const port = process.env.PORT ?? 3000;
	await app.listen(port);
	logger.log(`Application running on port ${port}`, 'Bootstrap');

	process.on('unhandledRejection', (reason) => {
		logger.error(
			`Unhandled Rejection: ${String(reason)}`,
			reason instanceof Error ? reason.stack : undefined,
			'Process',
		);
	});

	process.on('uncaughtException', (err) => {
		logger.error(
			`Uncaught Exception: ${err.message}`,
			err.stack,
			'Process',
		);
	});
}
void bootstrap();
