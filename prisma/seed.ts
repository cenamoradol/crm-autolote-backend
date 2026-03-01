import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

async function seedPlan() {
  return prisma.plan.upsert({
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
}

async function seedBrandsModels() {
  const toyota = await prisma.brand.upsert({
    where: { name: 'Toyota' },
    update: {},
    create: { name: 'Toyota' },
  });

  const honda = await prisma.brand.upsert({
    where: { name: 'Honda' },
    update: {},
    create: { name: 'Honda' },
  });

  const corolla = await prisma.model.upsert({
    where: { brandId_name: { brandId: toyota.id, name: 'Corolla' } },
    update: {},
    create: { brandId: toyota.id, name: 'Corolla' },
  });

  const rav4 = await prisma.model.upsert({
    where: { brandId_name: { brandId: toyota.id, name: 'RAV4' } },
    update: {},
    create: { brandId: toyota.id, name: 'RAV4' },
  });

  const civic = await prisma.model.upsert({
    where: { brandId_name: { brandId: honda.id, name: 'Civic' } },
    update: {},
    create: { brandId: honda.id, name: 'Civic' },
  });

  return { toyota, honda, corolla, rav4, civic };
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@crmautolo.com' },
    update: { passwordHash, isSuperAdmin: true, isActive: true },
    create: {
      email: 'superadmin@crmautolo.com',
      fullName: 'Super Admin',
      passwordHash,
      isSuperAdmin: true,
      isActive: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: { passwordHash, isActive: true },
    create: { email: 'admin@demo.com', fullName: 'Admin Demo', passwordHash, isActive: true },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@demo.com' },
    update: { passwordHash, isActive: true },
    create: { email: 'supervisor@demo.com', fullName: 'Supervisor Demo', passwordHash, isActive: true },
  });

  const seller = await prisma.user.upsert({
    where: { email: 'seller@demo.com' },
    update: { passwordHash, isActive: true },
    create: { email: 'seller@demo.com', fullName: 'Seller Demo', passwordHash, isActive: true },
  });

  return { superAdmin, admin, supervisor, seller };
}

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/:\d+$/, '');
}

async function main() {
  console.log('🌱 Seeding...');

  const plan = await seedPlan();

  const { superAdmin, admin, supervisor, seller } = await seedUsers();
  const { toyota, honda, corolla, rav4, civic } = await seedBrandsModels();

  // Store demo (upsert)
  const store = await prisma.store.upsert({
    where: { slug: 'demo-auto-lote' },
    update: {
      name: 'Demo Auto Lote',
      logoUrl: 'https://dummyimage.com/240x80/000/fff&text=Demo+Auto+Lote',
      isActive: true,
    },
    create: {
      name: 'Demo Auto Lote',
      slug: 'demo-auto-lote',
      logoUrl: 'https://dummyimage.com/240x80/000/fff&text=Demo+Auto+Lote',
      isActive: true,
    },
  });

  // Dominio tenant demo (upsert por domain)
  const demoDomain = normalizeDomain('portal.demo-autolote.local');
  await prisma.storeDomain.upsert({
    where: { domain: demoDomain },
    update: { storeId: store.id, isPrimary: true },
    create: { storeId: store.id, domain: demoDomain, isPrimary: true },
  });

  // Branch primario (crear si no existe)
  const branch =
    (await prisma.branch.findFirst({ where: { storeId: store.id, isPrimary: true } })) ??
    (await prisma.branch.create({
      data: {
        storeId: store.id,
        name: 'Principal',
        address: 'Tegucigalpa, Honduras',
        isPrimary: true,
      },
    }));

  const defaultPermissions = {
    admin: {
      inventory: ['read', 'create', 'update', 'delete'],
      sales: ['read', 'create', 'update', 'delete'],
      customers: ['read', 'create', 'update', 'delete'],
      leads: ['read', 'create', 'update', 'delete', 'read_all', 'update_all', 'delete_all', 'assign_all'],
      activities: ['read', 'create', 'update', 'delete', 'read_all', 'update_all', 'delete_all'],
      consignors: ['read', 'create', 'update', 'delete'],
      dashboard: ['read', 'read_team'],
      reports: ['read'],
      store_settings: ['read', 'update'],
      billing: ['read', 'update'],
      preferences: ['read', 'update'],
    },
    supervisor: {
      inventory: ['read', 'create', 'update', 'delete'],
      sales: ['read'],
      customers: ['read', 'create', 'update', 'delete'],
      leads: ['read', 'create', 'update', 'delete', 'read_all', 'update_all', 'delete_all', 'assign_all'],
      activities: ['read', 'create', 'update', 'delete', 'read_all', 'update_all', 'delete_all'],
      consignors: ['read', 'create', 'update', 'delete'],
      dashboard: ['read', 'read_team'],
      reports: ['read'],
      store_settings: ['read', 'update'],
      billing: ['read', 'update'],
      preferences: ['read', 'update'],
    },
    seller: {
      inventory: ['read'],
      sales: ['read', 'create'],
      customers: ['read', 'create', 'update'],
      leads: ['read', 'create', 'update'],
      activities: ['read', 'create', 'update'],
      consignors: ['read'],
      dashboard: [],
      reports: [],
      store_settings: [],
      billing: [],
      preferences: ['read', 'update'],
    }
  };

  async function ensureMembership(userId: string, perms: any) {
    await (prisma.userRole as any).upsert({
      where: { userId_storeId: { userId, storeId: store.id } },
      update: { permissions: perms },
      create: { userId, storeId: store.id, permissions: perms },
    });
  }

  await ensureMembership(superAdmin.id, defaultPermissions.admin);
  await ensureMembership(admin.id, defaultPermissions.admin);
  await ensureMembership(supervisor.id, defaultPermissions.supervisor);
  await ensureMembership(seller.id, defaultPermissions.seller);

  // Suscripción demo: NO duplicar si ya hay una ACTIVE vigente
  const now = new Date();
  const activeSub = await prisma.storeSubscription.findFirst({
    where: {
      storeId: store.id,
      status: 'ACTIVE',
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    select: { id: true },
  });

  if (!activeSub) {
    await prisma.storeSubscription.create({
      data: {
        storeId: store.id,
        planId: plan.id,
        provider: 'BANK_TRANSFER',
        status: 'ACTIVE',
        startsAt: now,
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        approvedByUserId: superAdmin.id,
        approvedAt: now,
        payments: {
          create: {
            provider: 'BANK_TRANSFER',
            status: 'PAID',
            amount: new Prisma.Decimal('0.00'),
            currency: 'USD',
            paidAt: now,
            metadata: { note: 'Demo seed payment' },
          },
        },
      },
    });
  }

  // Vehículos demo (se crearán nuevos cada seed, sin chocar unique)
  const v1 = await prisma.vehicle.create({
    data: {
      storeId: store.id,
      branchId: branch.id,
      publicId: nanoid(10),
      brandId: toyota.id,
      modelId: corolla.id,
      title: 'Toyota Corolla',
      description: 'Excelente estado, listo para traspaso.',
      year: 2018,
      price: new Prisma.Decimal('12500.00'),
      mileage: 78000,
      transmission: 'Automática',
      fuelType: 'Gasolina',
      isPublished: true,
      createdByUserId: admin.id,
      media: {
        create: [
          {
            kind: 'IMAGE',
            fileKey: 'seed/corolla-front.jpg',
            url: 'https://dummyimage.com/900x600/111/fff&text=Corolla+Front',
            position: 0,
            isCover: true,
          },
          {
            kind: 'IMAGE',
            fileKey: 'seed/corolla-back.jpg',
            url: 'https://dummyimage.com/900x600/333/fff&text=Corolla+Back',
            position: 1,
            isCover: false,
          },
        ],
      },
    },
  });

  const v2 = await prisma.vehicle.create({
    data: {
      storeId: store.id,
      branchId: branch.id,
      publicId: nanoid(10),
      brandId: honda.id,
      modelId: civic.id,
      title: 'Honda Civic',
      year: 2017,
      price: new Prisma.Decimal('11800.00'),
      mileage: 92000,
      isPublished: true,
      createdByUserId: supervisor.id,
      media: {
        create: [
          {
            kind: 'IMAGE',
            fileKey: 'seed/civic.jpg',
            url: 'https://dummyimage.com/900x600/222/fff&text=Civic',
            position: 0,
            isCover: true,
          },
        ],
      },
    },
  });

  await prisma.vehicle.create({
    data: {
      storeId: store.id,
      branchId: branch.id,
      publicId: nanoid(10),
      brandId: toyota.id,
      modelId: rav4.id,
      title: 'Toyota RAV4',
      year: 2019,
      price: new Prisma.Decimal('17900.00'),
      mileage: 65000,
      isPublished: false,
      createdByUserId: seller.id,
    },
  });

  // ✅ CUSTOMER idempotente por (storeId,email)
  const customerEmail = 'carlos@example.com';
  const customerPhone = '+50499990000';

  const customer = await prisma.customer.upsert({
    where: {
      // Prisma genera este unique input automáticamente por @@unique([storeId, email])
      storeId_email: { storeId: store.id, email: customerEmail },
    },
    update: {
      fullName: 'Carlos Rivera',
      phone: customerPhone,
      documentId: '0801-1990-00000',
    },
    create: {
      storeId: store.id,
      fullName: 'Carlos Rivera',
      phone: customerPhone,
      email: customerEmail,
      documentId: '0801-1990-00000',
    },
  });

  // Lead de demo (puede duplicarse por cada seed; si quieres también lo hacemos idempotente luego)
  const lead = await prisma.lead.create({
    data: {
      storeId: store.id,
      status: 'IN_PROGRESS',
      source: 'Facebook',
      fullName: 'Carlos Rivera',
      phone: customerPhone,
      email: customerEmail,
      assignedToUserId: seller.id,
      customerId: customer.id,
      preference: {
        create: {
          storeId: store.id,
          minPrice: new Prisma.Decimal('10000.00'),
          maxPrice: new Prisma.Decimal('14000.00'),
          yearFrom: 2016,
          yearTo: 2020,
          desiredBrandId: toyota.id,
          desiredModelId: corolla.id,
          notes: 'Prefiere sedan, automático.',
        },
      },
    },
  });

  // Venta demo (se crea nueva siempre porque vehicleId es nuevo)
  await prisma.vehicleSale.create({
    data: {
      storeId: store.id,
      vehicleId: v2.id,
      soldByUserId: seller.id,
      customerId: customer.id,
      leadId: lead.id,
      soldAt: new Date(),
      soldPrice: new Prisma.Decimal('11500.00'),
      notes: 'Venta de prueba seed',
    },
  });

  await prisma.vehicle.update({
    where: { id: v2.id },
    data: {
      status: 'SOLD',
      isPublished: false,
      soldAt: new Date(),
      soldPrice: new Prisma.Decimal('11500.00'),
    },
  });

  await prisma.vehicleStatusHistory.create({
    data: {
      vehicleId: v2.id,
      fromStatus: 'AVAILABLE',
      toStatus: 'SOLD',
      changedByUserId: seller.id,
    },
  });

  console.log('✅ Seed listo');
  console.log('🔐 Credenciales demo:');
  console.log('   superadmin@crmautolo.com / Password123!');
  console.log('   admin@demo.com / Password123!');
  console.log('   supervisor@demo.com / Password123!');
  console.log('   seller@demo.com / Password123!');
  console.log('🌐 Público:');
  console.log(`   GET /api/v1/public/stores/${store.slug}/vehicles`);
  console.log(`   GET /api/v1/public/stores/${store.slug}/vehicles/${v1.publicId}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
