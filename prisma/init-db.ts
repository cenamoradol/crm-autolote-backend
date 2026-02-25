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

    // 2. Create Super Admin
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin123!';

    console.log(`👤 Creating super admin: ${email}`);
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.upsert({
        where: { email },
        update: {
            passwordHash,
            isSuperAdmin: true,
            isActive: true
        },
        create: {
            email,
            fullName: 'Administrator',
            passwordHash,
            isSuperAdmin: true,
            isActive: true,
        },
    });

    console.log('✅ Initialization complete.');
}

main()
    .catch((e) => {
        console.error('❌ Init error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
