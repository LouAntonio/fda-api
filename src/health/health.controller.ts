import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { performance } from 'perf_hooks';
import * as pkg from '../../package.json';

const appStartTime = Date.now();

function formatUptime(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	if (h > 0) return `${h}h ${m}m ${s}s`;
	if (m > 0) return `${m}m ${s}s`;
	return `${s}s`;
}

function formatBytes(bytes: number): string {
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
	constructor(
		private prisma: PrismaService,
		private readonly cloudinary: CloudinaryService,
	) {}

	@Get()
	@ApiOperation({
		summary: 'Health check completo',
		description:
			'Retorna métricas detalhadas de saúde da API: sistema, memória, base de dados, Cloudinary, latência',
	})
	async check() {
		const start = performance.now();

		// --- Base de dados ---
		let dbStatus = 'online';
		let dbLatency = 0;
		try {
			const dbStart = performance.now();
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			await this.prisma.$queryRawUnsafe('SELECT 1');
			dbLatency = Number((performance.now() - dbStart).toFixed(2));
		} catch {
			dbStatus = 'error';
		}

		// --- Cloudinary ---
		const cldStart = performance.now();
		let cloudinaryStatus = 'online';
		try {
			this.cloudinary.getUploadSignature('health-check');
		} catch {
			cloudinaryStatus = 'error';
		}
		const cloudinaryLatency = Number(
			(performance.now() - cldStart).toFixed(2),
		);

		// --- Event Loop Lag ---
		const eventLoopLag = await new Promise<number>((resolve) => {
			const measured = performance.now();
			setImmediate(() => {
				resolve(Number((performance.now() - measured).toFixed(3)));
			});
		});

		// --- Memória ---
		const mem = process.memoryUsage();

		const latencyMs = Number((performance.now() - start).toFixed(2));

		return {
			status: dbStatus === 'error' ? 'degraded' : 'ok',
			timestamp: new Date(appStartTime).toISOString(),
			application: {
				name: (pkg as { name?: string }).name ?? 'FDA API',
				version: (pkg as { version?: string }).version ?? '0.0.0',
				environment: process.env.NODE_ENV ?? 'development',
				startTime: new Date(appStartTime).toISOString(),
				uptime: formatUptime(process.uptime()),
				nodeVersion: process.version,
			},
			memory: {
				rss: formatBytes(mem.rss),
				heapTotal: formatBytes(mem.heapTotal),
				heapUsed: formatBytes(mem.heapUsed),
				external: formatBytes(mem.external),
				arrayBuffers: formatBytes(mem.arrayBuffers),
				heapUsagePercent:
					mem.heapTotal > 0
						? ((mem.heapUsed / mem.heapTotal) * 100).toFixed(1) +
							'%'
						: '0%',
			},
			database: {
				status: dbStatus,
				latencyMs: dbLatency,
			},
			cloudinary: {
				status: cloudinaryStatus,
				latencyMs: cloudinaryLatency,
			},
			eventLoopLagMs: eventLoopLag,
			latencyMs,
		};
	}
}
