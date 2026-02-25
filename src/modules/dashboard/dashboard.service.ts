
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardFilterDto } from './dashboard.dto';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    async getKpis(storeId: string, filter: DashboardFilterDto) {
        const whereDate = {};
        if (filter.startDate) {
            const start = new Date(filter.startDate);
            start.setUTCHours(0, 0, 0, 0);
            whereDate['gte'] = start;
        }
        if (filter.endDate) {
            const end = new Date(filter.endDate);
            end.setUTCHours(23, 59, 59, 999);
            whereDate['lte'] = end;
        }

        const hasDateFilter = !!(filter.startDate || filter.endDate);

        // 1. Vehicles Available (snapshot, current status)
        // If date filter is present, it's tricky to say "available in that period". 
        // Usually availability is "current". Let's return current available for simplicity, 
        // or maybe vehicles created in that period if that's what is meant?
        // The user requirement says "available, reserved, sold" *according to a date filter*.
        // For "Sold" and "Reserved", date makes sense. For "Available", usually implies current stock. 
        // But if they want "Available" influenced by date... maybe "Became available"?
        // I will return current available count regardless of date filter for "available", 
        // but filter others.

        const available = await this.prisma.vehicle.count({
            where: { storeId, status: 'AVAILABLE' },
        });

        // 2. Reserved
        const reserved = await this.prisma.vehicle.count({
            where: {
                storeId,
                status: 'RESERVED',
                ...(hasDateFilter && {
                    // If we want to filter simply by status, date filter might apply to 
                    // when it became reserved? We don't have "reservedAt" easily queryable on Vehicle directly 
                    // unless we check reservation relation or status history.
                    // VehicleReservation has reservedAt.
                    reservation: {
                        reservedAt: whereDate
                    }
                }),
            },
        });
        // Alternative: Count reservations in that period?
        // User asked "Vehicles Reserved". Could mean active reservations.
        // I'll stick to 'RESERVED' status vehicles, optionally filtered by reservation time if exists.

        // 3. Sold
        const sold = await this.prisma.vehicleSale.count({
            where: {
                storeId,
                soldAt: Object.keys(whereDate).length ? whereDate : undefined,
            },
        });

        // 4. Leads
        const leads = await this.prisma.lead.count({
            where: {
                storeId,
                createdAt: Object.keys(whereDate).length ? whereDate : undefined,
            },
        });

        // 5. Total Sales Amount
        const salesAgg = await this.prisma.vehicleSale.aggregate({
            where: {
                storeId,
                soldAt: Object.keys(whereDate).length ? whereDate : undefined,
            },
            _sum: { soldPrice: true },
        });

        return {
            available,
            reserved,
            sold,
            leads,
            totalSales: Number(salesAgg._sum.soldPrice || 0),
        };
    }

    async getRecentActivities(storeId: string) {
        return this.prisma.activity.findMany({
            where: { storeId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                customer: { select: { fullName: true } },
                lead: { select: { fullName: true } },
                vehicle: { select: { title: true, stockNumber: true } },
                createdBy: { select: { fullName: true } },
            },
        });
    }

    async getTeamKpis(storeId: string, filter: DashboardFilterDto) {
        const whereDate = {};
        if (filter.startDate) {
            const start = new Date(filter.startDate);
            start.setUTCHours(0, 0, 0, 0);
            whereDate['gte'] = start;
        }
        if (filter.endDate) {
            const end = new Date(filter.endDate);
            end.setUTCHours(23, 59, 59, 999);
            whereDate['lte'] = end;
        }

        // 1. Get all users in this store
        const memberships = await (this.prisma.userRole as any).findMany({
            where: { storeId },
            select: {
                userId: true,
                permissions: true,
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
            },
        });

        // 2. Fetch stats per user
        const teamStats = await Promise.all(
            memberships.map(async (m) => {
                const userId = m.userId;

                const vehiclesCreated = await this.prisma.vehicle.count({
                    where: {
                        storeId,
                        createdByUserId: userId,
                        createdAt: Object.keys(whereDate).length ? whereDate : undefined,
                    },
                });

                const vehiclesSold = await this.prisma.vehicleSale.count({
                    where: {
                        storeId,
                        soldByUserId: userId,
                        soldAt: Object.keys(whereDate).length ? whereDate : undefined,
                    },
                });

                const activitiesLogged = await this.prisma.activity.count({
                    where: {
                        storeId,
                        createdByUserId: userId,
                        createdAt: Object.keys(whereDate).length ? whereDate : undefined,
                    },
                });

                return {
                    user: {
                        id: m.user.id,
                        fullName: m.user.fullName || m.user.email,
                        email: m.user.email,
                        permissions: m.permissions,
                    },
                    metrics: {
                        vehiclesCreated,
                        vehiclesSold,
                        activitiesLogged,
                    },
                };
            })
        );

        // Sort by vehicles created explicitly or total activity
        teamStats.sort((a, b) => b.metrics.vehiclesCreated - a.metrics.vehiclesCreated);

        return teamStats;
    }
}
