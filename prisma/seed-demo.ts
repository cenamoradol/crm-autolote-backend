import { PrismaClient, Prisma, VehicleStatus, ActivityType, CustomerStatus, Brand, Model, VehicleType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Robust Demo Seeder...');

    // 1. Plan
    console.log('📦 Seeding default plan...');
    const basicPlan = await prisma.plan.upsert({
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
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
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
    const sellerRole = await prisma.permissionSet.upsert({
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
    const existingMain = await prisma.branch.findFirst({ where: { storeId: store.id, name: 'Sucursal Principal' } });
    const finalMainBranch = existingMain || await prisma.branch.create({
        data: {
            storeId: store.id,
            name: 'Sucursal Principal',
            address: 'Colonia Modelo, Tegucigalpa',
            isPrimary: true,
        }
    });

    const existingSecond = await prisma.branch.findFirst({ where: { storeId: store.id, name: 'Sucursal Norte' } });
    const finalSecondBranch = existingSecond || await prisma.branch.create({
        data: {
            storeId: store.id,
            name: 'Sucursal Norte',
            address: 'Boulevard del Norte, San Pedro Sula',
            isPrimary: false,
        }
    });

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
        { name: 'Nissan', models: ['Sentra', 'Frontier', 'Kicks'] }
    ];

    const brandsMap = new Map<string, Brand>();
    const modelsMap = new Map<string, Model[]>();

    for (const b of brandsData) {
        const brand = await prisma.brand.upsert({
            where: { name: b.name },
            update: {},
            create: { name: b.name },
        });
        brandsMap.set(b.name, brand);
        const bModels: Model[] = [];
        for (const mName of b.models) {
            const model = await prisma.model.upsert({
                where: { brandId_name: { brandId: brand.id, name: mName } },
                update: {},
                create: { brandId: brand.id, name: mName },
            });
            bModels.push(model);
        }
        modelsMap.set(b.name, bModels);
    }

    // 9. Vehicles
    console.log('🚘 Seeding Vehicles...');
    const vehiclesData = [
        {
            vin: 'DEMO-VIN-HILUX-001',
            publicId: 'HILUX-2022',
            title: 'Toyota Hilux 2022 SRX 4x4',
            brand: 'Toyota',
            model: 'Hilux',
            year: 2022,
            price: '950000',
            mileage: 15000,
            color: 'Blanco',
            transmission: 'Automática',
            fuelType: 'Diesel',
            status: VehicleStatus.AVAILABLE,
            plate: 'HAV 1234',
            typeIndex: 2 // Pickup
        },
        {
            vin: 'DEMO-VIN-CRV-002',
            publicId: 'CRV-2018',
            title: 'Honda CR-V 2018 Touring',
            brand: 'Honda',
            model: 'CR-V',
            year: 2018,
            price: '550000',
            offerPrice: '525000',
            mileage: 45000,
            color: 'Gris',
            transmission: 'CVT',
            fuelType: 'Gasolina',
            status: VehicleStatus.AVAILABLE,
            plate: 'HBE 5566',
            typeIndex: 1 // SUV
        },
        {
            vin: 'DEMO-VIN-F150-003',
            publicId: 'F150-2020',
            title: 'Ford F-150 Raptor 2020',
            brand: 'Ford',
            model: 'F-150',
            year: 2020,
            price: '1450000',
            mileage: 28000,
            color: 'Negro',
            transmission: 'Automática',
            fuelType: 'Gasolina',
            status: VehicleStatus.RESERVED,
            plate: 'HCH 7788',
            typeIndex: 2
        }
    ];

    for (const v of vehiclesData) {
        const brand = brandsMap.get(v.brand);
        const models = modelsMap.get(v.brand);
        if (!brand || !models) continue;

        const model = models.find(m => m.name === v.model);
        if (!model) continue;

        await prisma.vehicle.upsert({
            where: { storeId_vin: { storeId: store.id, vin: v.vin } },
            update: {
                status: v.status,
                price: new Prisma.Decimal(v.price),
                offerPrice: v.offerPrice ? new Prisma.Decimal(v.offerPrice) : null,
            },
            create: {
                storeId: store.id,
                branchId: finalMainBranch.id,
                publicId: v.publicId,
                vin: v.vin,
                status: v.status,
                isPublished: true,
                brandId: brand.id,
                modelId: model.id,
                vehicleTypeId: vehicleTypes[v.typeIndex].id,
                title: v.title,
                year: v.year,
                price: new Prisma.Decimal(v.price),
                offerPrice: v.offerPrice ? new Prisma.Decimal(v.offerPrice) : null,
                mileage: v.mileage,
                color: v.color,
                transmission: v.transmission,
                fuelType: v.fuelType,
                plate: v.plate,
                createdByUserId: admin.id
            }
        });
    }

    // 10. Customers
    console.log('👥 Creating Demo Customers...');
    const customer = await prisma.customer.upsert({
        where: { storeId_phone: { storeId: store.id, phone: '+504 9988-7766' } },
        update: { status: CustomerStatus.ACTIVE },
        create: {
            storeId: store.id,
            fullName: 'Juan Pérez',
            phone: '+504 9988-7766',
            email: 'juan.perez@example.com',
            status: CustomerStatus.ACTIVE,
        }
    });

    const toyotaBrand = brandsMap.get('Toyota');
    if (toyotaBrand) {
        const existingPref = await prisma.customerPreference.findFirst({
            where: { customerId: customer.id, brandId: toyotaBrand.id }
        });
        if (!existingPref) {
            await prisma.customerPreference.create({
                data: {
                    storeId: store.id,
                    customerId: customer.id,
                    brandId: toyotaBrand.id,
                    yearFrom: 2020,
                    notes: 'Busca un pickup 4x4 reciente'
                }
            });
        }
    }

    const existingActivities = await prisma.activity.findFirst({
        where: { customerId: customer.id, notes: { contains: 'Hilux' } }
    });
    if (!existingActivities) {
        await prisma.activity.create({
            data: {
                storeId: store.id,
                customerId: customer.id,
                type: ActivityType.CALL,
                notes: 'Interesado en la Hilux blanca. Llamar el lunes.',
                createdByUserId: admin.id
            }
        });
    }

    console.log('✅ Seeding Complete!');
    console.log(`
      Super Admin: ${adminEmail}
      Password: ${adminPassword}
      Store Slug: autolote-demo
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
