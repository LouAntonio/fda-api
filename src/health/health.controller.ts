import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

function formatUptime(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	if (h > 0) return `${h}h ${m}m ${s}s`;
	if (m > 0) return `${m}m ${s}s`;
	return `${s}s`;
}

function formatBytes(bytes: number): string {
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

@Controller('health')
export class HealthController {
	constructor(private prisma: PrismaService) {}

	@Get()
	async check() {
		let dbStatus = 'online';
		try {
			await this.prisma.$queryRawUnsafe('SELECT 1');
		} catch {
			dbStatus = 'error';
		}

		const mem = process.memoryUsage();

		return {
			status: 'ok',
			timestamp: new Date().toLocaleString('pt-PT'),
			uptime: formatUptime(process.uptime()),
			memory: {
				rss: formatBytes(mem.rss),
				heapTotal: formatBytes(mem.heapTotal),
				heapUsed: formatBytes(mem.heapUsed),
			},
			database: dbStatus,
		};
	}
}
