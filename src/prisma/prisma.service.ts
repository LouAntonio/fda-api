import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { uuidv7 } from 'uuidv7';

function createExtendedClient() {
	const adapter = new PrismaPg({
		connectionString: process.env.DATABASE_URL!,
	});

	return new PrismaClient({ adapter }).$extends({
		query: {
			$allModels: {
				$allOperations(params: any) {
					const { operation, args, query } = params;
					if (
						(operation === 'create' && !args.data['id']) ||
						(operation === 'upsert' && !args.create['id'])
					) {
						args.data['id'] = uuidv7();
					}
					if (operation === 'createMany') {
						const data = Array.isArray(args.data)
							? args.data
							: [args.data];
						for (const item of data) {
							if (!item['id']) {
								item['id'] = uuidv7();
							}
						}
					}
					return query(args);
				},
			},
		},
	});
}

export type ExtendedPrismaClient = ReturnType<typeof createExtendedClient>;

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
		return this.client.$queryRawUnsafe.bind(this.client);
	}
}
