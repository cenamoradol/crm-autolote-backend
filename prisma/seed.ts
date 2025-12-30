import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

async function seedRoles() {
  await prisma.role.upsert({ where: { key: 'admin' }, update: {}, create: { key: 'admin', name: 'Admin' } });
  await prisma.role.upsert({ where: { key: 'supervisor' }, update: {}, create: { key: 'supervisor', name: 'Supervisor' } });
  await prisma.role.upsert({ where: { key: 'seller' }, update: {}, create: { key: 'seller', name: 'Seller' } });
}

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
  const toyota = await prisma.brand.upsert({ where: { name: 'Toyota' }, update: {}, create: { name: 'Toyota' } });
  const honda = await prisma.brand.upsert({ where: { name: 'Honda' }, update: {}, create: { name: 'Honda' } });

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

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: { passwordHash },
    create: { email: 'admin@demo.com', fullName: 'Admin Demo', passwordHash },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@demo.com' },
    update: { passwordHash },
    create: { email: 'supervisor@demo.com', fullName: 'Supervisor Demo', passwordHash },
  });

  const seller = await prisma.user.upsert({
    where: { email: 'seller@demo.com' },
    update: { passwordHash },
    create: { email: 'seller@demo.com', fullName: 'Seller Demo', passwordHash },
  });

  return { admin, supervisor, seller };
}

async function main() {
  console.log('🌱 Seeding...');
  await seedRoles();
  const plan = await seedPlan();
  const roles = await prisma.role.findMany();
  const roleByKey = new Map(roles.map(r => [r.key, r]));

  const { admin, supervisor, seller } = await seedUsers();
  const { toyota, honda, corolla, rav4, civic } = await seedBrandsModels();

  const store = await prisma.store.upsert({
    where: { slug: 'demo-auto-lote' },
    update: { name: 'Demo Auto Lote', logoUrl: 'https://dummyimage.com/240x80/000/fff&text=Demo+Auto+Lote' },
    create: { name: 'Demo Auto Lote', slug: 'demo-auto-lote', logoUrl: 'https://dummyimage.com/240x80/000/fff&text=Demo+Auto+Lote' },
  });

  const branch =
    (await prisma.branch.findFirst({ where: { storeId: store.id, isPrimary: true } })) ??
    (await prisma.branch.create({
      data: { storeId: store.id, name: 'Principal', address: 'Tegucigalpa, Honduras', isPrimary: true },
    }));

  async function ensureMembership(userId: string, roleKey: 'admin' | 'supervisor' | 'seller') {
    const role = roleByKey.get(roleKey);
    if (!role) throw new Error(`Role ${roleKey} no existe.`);
    await prisma.userRole.upsert({
      where: { userId_storeId_roleId: { userId, storeId: store.id, roleId: role.id } },
      update: {},
      create: { userId, storeId: store.id, roleId: role.id },
    });
  }

  await ensureMembership(admin.id, 'admin');
  await ensureMembership(supervisor.id, 'supervisor');
  await ensureMembership(seller.id, 'seller');

  await prisma.storeSubscription.create({
    data: {
      storeId: store.id,
      planId: plan.id,
      provider: 'BANK_TRANSFER',
      status: 'ACTIVE',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      approvedByUserId: admin.id,
      approvedAt: new Date(),
      payments: {
        create: {
          provider: 'BANK_TRANSFER',
          status: 'PAID',
          amount: new Prisma.Decimal('0.00'),
          currency: 'USD',
          paidAt: new Date(),
          metadata: { note: 'Demo seed payment' },
        },
      },
    },
  });

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
      color: 'Blanco',
      transmission: 'Automática',
      fuelType: 'Gasolina',
      isPublished: true,
      createdByUserId: admin.id,
      media: {
        create: [
          { kind: 'IMAGE', fileKey: 'seed/corolla-front.jpg', url: 'https://dummyimage.com/900x600/111/fff&text=Corolla+Front', position: 0, isCover: true },
          { kind: 'IMAGE', fileKey: 'seed/corolla-back.jpg', url: 'https://dummyimage.com/900x600/333/fff&text=Corolla+Back', position: 1, isCover: false },
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
        create: [{ kind: 'IMAGE', fileKey: 'seed/civic.jpg', url: 'https://dummyimage.com/900x600/222/fff&text=Civic', position: 0, isCover: true }],
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

  const customer = await prisma.customer.create({
    data: { storeId: store.id, fullName: 'Carlos Rivera', phone: '+50499990000', email: 'carlos@example.com', documentId: '0801-1990-00000' },
  });

  const lead = await prisma.lead.create({
    data: {
      storeId: store.id,
      status: 'IN_PROGRESS',
      source: 'Facebook',
      fullName: 'Carlos Rivera',
      phone: '+50499990000',
      email: 'carlos@example.com',
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
    data: { status: 'SOLD', isPublished: false, soldAt: new Date(), soldPrice: new Prisma.Decimal('11500.00') },
  });

  await prisma.vehicleStatusHistory.create({
    data: { vehicleId: v2.id, fromStatus: 'AVAILABLE', toStatus: 'SOLD', changedByUserId: seller.id },
  });

  console.log('✅ Seed listo');
  console.log('🔐 Credenciales demo:');
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
