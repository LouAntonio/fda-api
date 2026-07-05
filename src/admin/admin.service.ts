import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
	constructor(private prisma: PrismaService) {}

	async getDashboard() {
		const now = new Date();
		const startOfToday = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		);
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - now.getDay());
		startOfWeek.setHours(0, 0, 0, 0);
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		const [
			tripsToday,
			tripsThisWeek,
			tripsThisMonth,
			totalTrips,
			revenueToday,
			revenueThisWeek,
			revenueThisMonth,
			totalRevenue,
			activeDrivers,
			totalApprovedDrivers,
			overallStats,
			pendingDocumentsCount,
			openDisputesCount,
		] = await Promise.all([
			this.prisma.client.trip.count({
				where: { createdAt: { gte: startOfToday }, deletedAt: null },
			}),
			this.prisma.client.trip.count({
				where: { createdAt: { gte: startOfWeek }, deletedAt: null },
			}),
			this.prisma.client.trip.count({
				where: { createdAt: { gte: startOfMonth }, deletedAt: null },
			}),
			this.prisma.client.trip.count({ where: { deletedAt: null } }),
			this.prisma.client.trip
				.aggregate({
					_sum: { totalPrice: true },
					where: {
						status: 'COMPLETED',
						completedAt: { gte: startOfToday },
						deletedAt: null,
					},
				})
				.then((r) => r._sum.totalPrice ?? 0),
			this.prisma.client.trip
				.aggregate({
					_sum: { totalPrice: true },
					where: {
						status: 'COMPLETED',
						completedAt: { gte: startOfWeek },
						deletedAt: null,
					},
				})
				.then((r) => r._sum.totalPrice ?? 0),
			this.prisma.client.trip
				.aggregate({
					_sum: { totalPrice: true },
					where: {
						status: 'COMPLETED',
						completedAt: { gte: startOfMonth },
						deletedAt: null,
					},
				})
				.then((r) => r._sum.totalPrice ?? 0),
			this.prisma.client.trip
				.aggregate({
					_sum: { totalPrice: true },
					where: { status: 'COMPLETED', deletedAt: null },
				})
				.then((r) => r._sum.totalPrice ?? 0),
			this.prisma.client.driver.count({
				where: { availability: 'ONLINE', deletedAt: null },
			}),
			this.prisma.client.driver.count({
				where: {
					complianceStatus: 'APPROVED',
					deletedAt: null,
				},
			}),
			this.prisma.client
				.$queryRawUnsafe<
					{ cancellationRate: number; avgRating: number }[]
				>(
					`SELECT
					COALESCE(
						(COUNT(*) FILTER (WHERE status = 'CANCELLED'))::float / NULLIF(COUNT(*), 0) * 100,
						0
					) as "cancellationRate",
					COALESCE(AVG(r.rating), 0) as "avgRating"
				FROM "Trip" t
				LEFT JOIN "Review" r ON r.id = (
					SELECT id FROM "Review"
					WHERE "tripId" = t.id
					LIMIT 1
				)
				WHERE t."deletedAt" IS NULL`,
				)
				.then((r) => r[0] ?? { cancellationRate: 0, avgRating: 0 }),
			this.prisma.client.driverDocument.count({
				where: { status: 'PENDING' },
			}),
			this.prisma.client.dispute.count({
				where: { resolvedAt: null, deletedAt: null },
			}),
		]);

		return {
			trips: {
				today: Number(tripsToday),
				thisWeek: Number(tripsThisWeek),
				thisMonth: Number(tripsThisMonth),
				total: Number(totalTrips),
			},
			revenue: {
				today: Number(revenueToday),
				thisWeek: Number(revenueThisWeek),
				thisMonth: Number(revenueThisMonth),
				total: Number(totalRevenue),
			},
			drivers: {
				activeOnline: Number(activeDrivers),
				totalApproved: Number(totalApprovedDrivers),
			},
			overallStats: {
				cancellationRate: Number(overallStats.cancellationRate),
				avgRating: Number(overallStats.avgRating),
			},
			pendingDocuments: Number(pendingDocumentsCount),
			openDisputes: Number(openDisputesCount),
		};
	}

	async getTripStats(
		dateFrom?: string,
		dateTo?: string,
		groupBy?: 'day' | 'week' | 'month',
		serviceType?: string,
		paymentMethod?: string,
	) {
		const from = dateFrom
			? new Date(dateFrom)
			: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		const to = dateTo ? new Date(dateTo) : new Date();
		const trunc = groupBy ?? 'day';

		const truncMap: Record<string, string> = {
			day: 'DATE(',
			week: "DATE_TRUNC('week', ",
			month: "DATE_TRUNC('month', ",
		};
		const truncFn = truncMap[trunc];

		const filters: string[] = [
			`"createdAt" >= $1`,
			`"createdAt" <= $2`,
			`"deletedAt" IS NULL`,
		];
		const params: unknown[] = [from, to];
		let paramIndex = 3;

		if (serviceType) {
			filters.push(`"serviceType" = $${paramIndex++}`);
			params.push(serviceType);
		}
		if (paymentMethod) {
			filters.push(`"paymentMethod" = $${paramIndex++}`);
			params.push(paymentMethod);
		}

		const where = filters.join(' AND ');

		const stats = await this.prisma.client.$queryRawUnsafe<
			{
				period: string;
				totalTrips: number;
				completedTrips: number;
				cancelledTrips: number;
				totalRevenue: number;
				avgTripValue: number;
				avgWaitMinutes: number;
				avgDistanceKm: number;
				avgDurationMin: number;
			}[]
		>(
			`SELECT
				${truncFn}"createdAt") as period,
				COUNT(*)::int as "totalTrips",
				COUNT(*) FILTER (WHERE status = 'COMPLETED')::int as "completedTrips",
				COUNT(*) FILTER (WHERE status = 'CANCELLED')::int as "cancelledTrips",
				COALESCE(SUM("totalPrice") FILTER (WHERE status = 'COMPLETED'), 0) as "totalRevenue",
				COALESCE(AVG("totalPrice") FILTER (WHERE status = 'COMPLETED'), 0) as "avgTripValue",
				COALESCE(
					AVG(
						EXTRACT(EPOCH FROM ("acceptedAt" - "requestedAt")) / 60
					) FILTER (WHERE "acceptedAt" IS NOT NULL),
					0
				) as "avgWaitMinutes",
				COALESCE(AVG("estimatedDistanceKm"), 0) as "avgDistanceKm",
				COALESCE(AVG("actualDurationMin"), 0) as "avgDurationMin"
			FROM "Trip"
			WHERE ${where}
			GROUP BY period
			ORDER BY period ASC`,
			...params,
		);

		return stats;
	}

	async getDriverStats(dateFrom?: string, dateTo?: string) {
		const from = dateFrom
			? new Date(dateFrom)
			: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		const to = dateTo ? new Date(dateTo) : new Date();

		const [statusBreakdown, complianceBreakdown, newDrivers, topDrivers] =
			await Promise.all([
				this.prisma.client.driver.groupBy({
					by: ['availability'],
					_count: { id: true },
					where: { deletedAt: null },
				}),
				this.prisma.client.driver.groupBy({
					by: ['complianceStatus'],
					_count: { id: true },
					where: { deletedAt: null },
				}),
				this.prisma.client.driver.count({
					where: {
						createdAt: { gte: from, lte: to },
						deletedAt: null,
					},
				}),
				this.prisma.client.$queryRawUnsafe<
					{
						driverId: string;
						name: string;
						completedTrips: number;
						avgRating: number;
					}[]
				>(
					`SELECT
						d.id as "driverId",
						u.name,
						d."completedTripsCount"::int as "completedTrips",
						d."ratingAverage" as "avgRating"
					FROM "Driver" d
					JOIN "User" u ON u.id = d."userId"
					WHERE d."deletedAt" IS NULL
					ORDER BY d."completedTripsCount" DESC
					LIMIT 10`,
				),
			]);

		const driverTrend = await this.prisma.client.$queryRawUnsafe<
			{ period: string; count: number }[]
		>(
			`SELECT
				DATE("createdAt") as period,
				COUNT(*)::int as count
			FROM "Driver"
			WHERE "createdAt" >= $1 AND "createdAt" <= $2 AND "deletedAt" IS NULL
			GROUP BY period
			ORDER BY period ASC`,
			from,
			to,
		);

		return {
			statusBreakdown: statusBreakdown.map((s) => ({
				status: s.availability,
				count: s._count.id,
			})),
			complianceBreakdown: complianceBreakdown.map((c) => ({
				status: c.complianceStatus,
				count: c._count.id,
			})),
			newDrivers: {
				count: Number(newDrivers),
				trend: driverTrend,
			},
			topDrivers,
		};
	}

	async getRevenueStats(
		dateFrom?: string,
		dateTo?: string,
		groupBy?: 'day' | 'week' | 'month',
	) {
		const from = dateFrom
			? new Date(dateFrom)
			: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		const to = dateTo ? new Date(dateTo) : new Date();
		const trunc = groupBy ?? 'day';

		const truncMap: Record<string, string> = {
			day: 'DATE(',
			week: "DATE_TRUNC('week', ",
			month: "DATE_TRUNC('month', ",
		};
		const truncFn = truncMap[trunc];

		const trend = await this.prisma.client.$queryRawUnsafe<
			{
				period: string;
				revenue: number;
				subtotal: number;
				ivaAmount: number;
				serviceFee: number;
				driverEarnings: number;
				tripCount: number;
			}[]
		>(
			`SELECT
				${truncFn}"completedAt") as period,
				COALESCE(SUM("totalPrice"), 0) as revenue,
				COALESCE(SUM("subtotal"), 0) as subtotal,
				COALESCE(SUM("ivaAmount"), 0) as "ivaAmount",
				COALESCE(SUM("serviceFee"), 0) as "serviceFee",
				COALESCE(SUM("driverEarnings"), 0) as "driverEarnings",
				COUNT(*)::int as "tripCount"
			FROM "Trip"
			WHERE status = 'COMPLETED'
				AND "completedAt" >= $1 AND "completedAt" <= $2
				AND "deletedAt" IS NULL
			GROUP BY period
			ORDER BY period ASC`,
			from,
			to,
		);

		const byPaymentMethod = await this.prisma.client.trip.groupBy({
			by: ['paymentMethod'],
			_sum: { totalPrice: true },
			_count: { id: true },
			where: {
				status: 'COMPLETED',
				completedAt: { gte: from, lte: to },
				deletedAt: null,
			},
		});

		const totals = await this.prisma.client.trip
			.aggregate({
				_sum: {
					totalPrice: true,
					subtotal: true,
					ivaAmount: true,
					serviceFee: true,
					driverEarnings: true,
				},
				_avg: { totalPrice: true },
				where: {
					status: 'COMPLETED',
					completedAt: { gte: from, lte: to },
					deletedAt: null,
				},
			})
			.then((r) => ({
				totalRevenue: r._sum.totalPrice ?? 0,
				avgTripValue: r._avg.totalPrice ?? 0,
				totalSubtotal: r._sum.subtotal ?? 0,
				totalIva: r._sum.ivaAmount ?? 0,
				totalServiceFee: r._sum.serviceFee ?? 0,
				totalDriverEarnings: r._sum.driverEarnings ?? 0,
			}));

		return {
			totals: {
				totalRevenue: Number(totals.totalRevenue),
				avgTripValue: Number(totals.avgTripValue),
				totalSubtotal: Number(totals.totalSubtotal),
				totalIva: Number(totals.totalIva),
				totalServiceFee: Number(totals.totalServiceFee),
				totalDriverEarnings: Number(totals.totalDriverEarnings),
			},
			byPaymentMethod: byPaymentMethod.map((p) => ({
				method: p.paymentMethod,
				revenue: Number(p._sum.totalPrice ?? 0),
				tripCount: p._count.id,
			})),
			trend: trend.map((t) => ({
				period: t.period,
				revenue: Number(t.revenue),
				subtotal: Number(t.subtotal),
				ivaAmount: Number(t.ivaAmount),
				serviceFee: Number(t.serviceFee),
				driverEarnings: Number(t.driverEarnings),
				tripCount: t.tripCount,
			})),
		};
	}

	async getUserStats(dateFrom?: string, dateTo?: string) {
		const from = dateFrom
			? new Date(dateFrom)
			: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		const to = dateTo ? new Date(dateTo) : new Date();

		const [totalUsers, signupTrend, roleBreakdown, verifiedStats] =
			await Promise.all([
				this.prisma.client.user.count({ where: { deletedAt: null } }),
				this.prisma.client.$queryRawUnsafe<
					{ period: string; count: number }[]
				>(
					`SELECT
						DATE("createdAt") as period,
						COUNT(*)::int as count
					FROM "User"
					WHERE "createdAt" >= $1 AND "createdAt" <= $2 AND "deletedAt" IS NULL
					GROUP BY period
					ORDER BY period ASC`,
					from,
					to,
				),
				this.prisma.client.user.groupBy({
					by: ['role'],
					_count: { id: true },
					where: { deletedAt: null },
				}),
				this.prisma.client
					.$queryRawUnsafe<
						{ phoneVerified: number; emailVerified: number }[]
					>(
						`SELECT
							COUNT(*) FILTER (WHERE "phoneNumberVerified" = true)::int as "phoneVerified",
							COUNT(*) FILTER (WHERE "emailVerified" = true)::int as "emailVerified"
						FROM "User"
						WHERE "deletedAt" IS NULL`,
					)
					.then((r) => r[0]),
			]);

		return {
			totalUsers: Number(totalUsers),
			newUsersInPeriod: signupTrend.reduce((sum, s) => sum + s.count, 0),
			signupTrend,
			roleBreakdown: roleBreakdown.map((r) => ({
				role: r.role,
				count: r._count.id,
			})),
			verifiedUsers: {
				phoneVerified: verifiedStats?.phoneVerified ?? 0,
				emailVerified: verifiedStats?.emailVerified ?? 0,
			},
		};
	}
}
