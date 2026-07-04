import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function createExtendedClient() {
	const adapter = new PrismaPg({
		connectionString: process.env.DATABASE_URL!,
	});

	return new PrismaClient({ adapter });
}

export type ExtendedPrismaClient = PrismaClient;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
	public client: ExtendedPrismaClient;

	constructor() {
		this.client = createExtendedClient();
	}

	async onModuleInit() {
		await this.client.$connect();
	}

	async onModuleDestroy() {
		await this.client.$disconnect();
	}

	get $queryRawUnsafe() {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return this.client.$queryRawUnsafe.bind(this.client);
	}
}
