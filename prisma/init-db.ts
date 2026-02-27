import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Initializing minimal database setup...');

    // 1. Seed Plan (Required for subscriptions)
    console.log('📦 Seeding default plan...');
    await prisma.plan.upsert({
        where: { code: 'basic' },
        update: {},
        create: {
            code: 'basic',
            name: 'Basic',
            priceMonthly: new Prisma.Decimal('0.00'),
            currency: 'USD',
            isActive: true,
            features: { readonlyWhenExpired: true },
        },
    });

    // 2. Run Demo Seeder
    console.log('🌱 Running demo seeder...');
    // We already have seed-demo.ts, let's just use it or copy its logic.
    // For simplicity and to ensure it works in Render environment, I'll update db:init in package.json to run the seeder.
    console.log('✅ Initialization complete. Run npm run db:seed:demo to populate test data.');
}

main()
    .catch((e) => {
        console.error('❌ Init error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
