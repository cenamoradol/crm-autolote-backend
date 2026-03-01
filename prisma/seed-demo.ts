import { PrismaClient, Prisma, VehicleStatus, ActivityType, CustomerStatus, Brand, Model, VehicleType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Robust Demo Seeder with Faker...');

    // 1. Plan
    console.log('📦 Seeding default plan...');
    await prisma.plan.upsert({
        where: { code: 'basic' },
        update: {},
        create: {
            code: 'basic',
            name: 'Basic Plan',
            priceMonthly: new Prisma.Decimal('0.00'),
            currency: 'USD',
            isActive: true,
            features: { readonlyWhenExpired: true, maxVehicles: 100 },
        },
    });

    // 2. Super Admin User
    const adminEmail = process.env.ADMIN_EMAIL || 'isaaceverywere@gmail.com';
    const adminPassword = 'Admin123!';
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    console.log(`👤 Creating/Updating Super Admin: ${adminEmail}`);
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: { passwordHash, isSuperAdmin: true, isActive: true },
        create: {
            email: adminEmail,
            fullName: 'Main Administrator',
            passwordHash,
            isSuperAdmin: true,
            isActive: true,
            phone: '+504 3322-1100'
        },
    });

    // 3. Store
    console.log('🏬 Creating Demo Store...');
    const store = await prisma.store.upsert({
        where: { slug: 'autolote-demo' },
        update: {},
        create: {
            name: 'Auto Lote Demo',
            slug: 'autolote-demo',
            isActive: true,
            currency: 'HNL',
            currencySymbol: 'L',
        },
    });

    // 4. Permission Set (Role)
    console.log('🔑 Creating default roles...');
    await prisma.permissionSet.upsert({
        where: { storeId_name: { storeId: store.id, name: 'Vendedor' } },
        update: {},
        create: {
            storeId: store.id,
            name: 'Vendedor',
            permissions: {
                vehicles: ['read', 'create', 'update'],
                customers: ['read', 'create', 'update', 'activities'],
                leads: ['read', 'create', 'update', 'preferences'],
                sales: ['read', 'create']
            }
        }
    });

    // 5. User Membership
    await prisma.userRole.upsert({
        where: { userId_storeId: { userId: admin.id, storeId: store.id } },
        update: { permissionSetId: null, permissions: { all: true } },
        create: {
            userId: admin.id,
            storeId: store.id,
            permissions: { all: true }
        }
    });

    // 6. Branches
    console.log('📍 Creating Branches...');
    const branches: any[] = [];

    let mainBranch = await prisma.branch.findFirst({
        where: { storeId: store.id, name: 'Sucursal Principal' }
    });
    if (!mainBranch) {
        mainBranch = await prisma.branch.create({
            data: {
                storeId: store.id,
                name: 'Sucursal Principal',
                address: 'Colonia Modelo, Tegucigalpa',
                isPrimary: true,
            }
        });
    }
    branches.push(mainBranch);

    let secondaryBranch = await prisma.branch.findFirst({
        where: { storeId: store.id, name: 'Sucursal Norte' }
    });
    if (!secondaryBranch) {
        secondaryBranch = await prisma.branch.create({
            data: {
                storeId: store.id,
                name: 'Sucursal Norte',
                address: 'Boulevard del Norte, San Pedro Sula',
                isPrimary: false,
            }
        });
    }
    branches.push(secondaryBranch);

    // 7. Vehicle Types
    console.log('🚗 Creating Vehicle Types...');
    const typesData = ['Turismo', 'SUV', 'Pickup', 'Camioneta', 'Hatchback', 'Camión'];
    const vehicleTypes: VehicleType[] = [];
    for (const name of typesData) {
        const vt = await prisma.vehicleType.upsert({
            where: { name },
            update: {},
            create: { name },
        });
        vehicleTypes.push(vt);
    }

    // 8. Brands & Models
    console.log('🏷️ Creating Brands and Models...');
    const brandsData = [
        { name: 'Toyota', models: ['Corolla', 'Hilux', 'RAV4', 'Prado', 'Tacoma'] },
        { name: 'Honda', models: ['Civic', 'CR-V', 'Accord'] },
        { name: 'Ford', models: ['F-150', 'Explorer', 'Escape', 'Ranger'] },
        { name: 'Mitsubishi', models: ['L200', 'Montero', 'Nativa'] },
        { name: 'Nissan', models: ['Sentra', 'Frontier', 'Kicks'] },
        { name: 'Hyundai', models: ['Elantra', 'Tucson', 'Santa Fe'] },
        { name: 'Kia', models: ['Sportage', 'Sorento', 'Rio'] },
        { name: 'Mazda', models: ['CX-5', 'CX-9', 'Mazda 3'] }
    ];

    const brands: Brand[] = [];
    const modelsByBrandId: Record<string, Model[]> = {};

    for (const b of brandsData) {
        const brand = await prisma.brand.upsert({
            where: { name: b.name },
            update: {},
            create: { name: b.name },
        });
        brands.push(brand);
        modelsByBrandId[brand.id] = [];
        for (const mName of b.models) {
            const model = await prisma.model.upsert({
                where: { brandId_name: { brandId: brand.id, name: mName } },
                update: {},
                create: { brandId: brand.id, name: mName },
            });
            modelsByBrandId[brand.id].push(model);
        }
    }

    // 9. Customers
    console.log('👥 Creating 50 Demo Customers...');
    const customers: any[] = [];
    for (let i = 0; i < 50; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        // Fixed numeric usage
        const phone = '+504 ' + faker.string.numeric(8);
        const c = await prisma.customer.create({
            data: {
                storeId: store.id,
                fullName: `${firstName} ${lastName}`,
                phone,
                email: faker.internet.email({ firstName, lastName }),
                // Fixed enum values
                status: faker.helpers.arrayElement([
                    CustomerStatus.ACTIVE,
                    CustomerStatus.CONTACTED,
                    CustomerStatus.PURCHASED
                ]),
                createdByUserId: admin.id
            }
        });
        customers.push(c);
    }

    // 10. Vehicles
    console.log('🚘 Creating 60 Demo Vehicles...');
    const vehicles: any[] = [];
    const colors = ['Blanco', 'Gris', 'Negro', 'Rojo', 'Azul', 'Plata', 'Verde'];
    const transmissions = ['Automática', 'Manual', 'CVT'];
    const fuelTypes = ['Gasolina', 'Diesel', 'Híbrido'];

    for (let i = 0; i < 60; i++) {
        const brand = faker.helpers.arrayElement(brands);
        const models = modelsByBrandId[brand.id];
        const model = faker.helpers.arrayElement(models);
        const year = faker.number.int({ min: 2010, max: 2024 });
        const price = faker.number.int({ min: 150000, max: 1800000 });
        const offerPrice = Math.random() > 0.7 ? price * 0.9 : null;
        const vin = faker.vehicle.vin();

        const v = await prisma.vehicle.create({
            data: {
                storeId: store.id,
                branchId: faker.helpers.arrayElement(branches).id,
                publicId: vin.slice(0, 8),
                vin,
                status: faker.helpers.arrayElement([VehicleStatus.AVAILABLE, VehicleStatus.AVAILABLE, VehicleStatus.RESERVED]),
                isPublished: true,
                brandId: brand.id,
                modelId: model.id,
                vehicleTypeId: faker.helpers.arrayElement(vehicleTypes).id,
                title: `${brand.name} ${model.name} ${year}`,
                year,
                price: new Prisma.Decimal(price),
                offerPrice: offerPrice ? new Prisma.Decimal(offerPrice) : null,
                mileage: faker.number.int({ min: 0, max: 150000 }),
                transmission: faker.helpers.arrayElement(transmissions),
                fuelType: faker.helpers.arrayElement(fuelTypes),
                plate: faker.string.alphanumeric({ length: 7, casing: 'upper' }),
                createdByUserId: admin.id
            }
        });
        vehicles.push(v);
    }

    // 11. Sales (Sell at least 15 vehicles)
    console.log('💰 Creating 20 Demo Sales...');
    const availableVehicleIndices = vehicles
        .map((v, idx) => v.status !== VehicleStatus.SOLD ? idx : -1)
        .filter(idx => idx !== -1);

    const soldVehiclesIndices = faker.helpers.arrayElements(availableVehicleIndices, 20);

    for (const idx of soldVehiclesIndices) {
        const vehicle = vehicles[idx];
        const customer = faker.helpers.arrayElement(customers);

        await prisma.vehicleSale.create({
            data: {
                storeId: store.id,
                vehicleId: vehicle.id,
                soldByUserId: admin.id,
                createdByUserId: admin.id,
                customerId: customer.id,
                soldPrice: vehicle.price,
                soldAt: faker.date.recent({ days: 60 }),
                status: 'COMPLETED'
            }
        });

        // Update vehicle status
        await prisma.vehicle.update({
            where: { id: vehicle.id },
            data: { status: VehicleStatus.SOLD }
        });
    }

    console.log('✅ Seeding Complete!');
    console.log(`
      Super Admin: ${adminEmail}
      Password: ${adminPassword}
      Store Slug: autolote-demo
      Records Created:
        - Customers: 50
        - Vehicles: 60 (20 Sold)
        - Sales: 20
    `);
}

main()
    .catch((e) => {
        console.error('❌ Seeding Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
