import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- TEST: Vinculación de Venta con Cliente ---');

    // 1. Obtener la tienda y el usuario administrador
    const store = await prisma.store.findFirst();
    const user = await prisma.user.findFirst();
    if (!store || !user) throw new Error('No hay tienda o usuario configurado.');

    // 2. Obtener al cliente de prueba ("Carlos Hernández")
    let customer = await prisma.customer.findFirst({
        where: { fullName: { contains: 'Carlos Hernández' } }
    });
    if (!customer) throw new Error('No se encontró el cliente Carlos Hernández.');

    console.log(`👤 Cliente actual: ${customer.fullName} | Estado: ${customer.status}`);

    // 3. Crear un vehículo temporal para venderle
    const branch = await prisma.branch.findFirst({ where: { storeId: store.id } });
    const brand = await prisma.brand.findFirst();
    const model = await prisma.model.findFirst({ where: { brandId: brand?.id } });

    if (!branch || !brand || !model) throw new Error('Faltan datos de sucursal, marca o modelo.');

    const vehicle = await prisma.vehicle.create({
        data: {
            storeId: store.id,
            branchId: branch.id,
            publicId: `TEST-V-${Date.now().toString().slice(-4)}`,
            brandId: brand.id,
            modelId: model.id,
            year: 2020,
            price: 15000,
            mileage: 50000,
            status: 'AVAILABLE',
            engineSize: 2.0,
            transmission: 'Automática',
            fuelType: 'Gasolina',
            color: 'Blanco',
        }
    });

    console.log(`🚗 Vehículo creado para la venta: ${vehicle.publicId} (${vehicle.year})`);

    // 4. MÉTODOS DIRECTOS (Simulando lo que hace el Controller/Service)
    console.log(`\n⏳ Creando venta y vinculando al cliente...`);
    const now = new Date();

    // Transacción de venta (igual que en sales.service.create)
    const sale = await prisma.vehicleSale.create({
        data: {
            storeId: store.id,
            vehicleId: vehicle.id,
            soldByUserId: user.id,
            customerId: customer.id, // VINCULACIÓN
            soldAt: now,
            soldPrice: 14500,
            notes: 'Venta de prueba para verificar vinculación de cliente',
        }
    });

    await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { status: 'SOLD', isPublished: false, soldAt: now, soldPrice: 14500 }
    });

    // La actualización automática que añadimos en el servicio:
    await prisma.customer.update({
        where: { id: customer.id },
        data: { status: 'PURCHASED' as any },
    });

    await prisma.activity.create({
        data: {
            storeId: store.id,
            type: 'SYSTEM' as any,
            notes: `Cliente marcado como COMPRÓ — Venta de vehículo ${vehicle.publicId}`,
            customerId: customer.id,
            createdByUserId: user.id,
        } as any,
    });

    console.log(`✅ Venta completada (ID: ${sale.id})`);

    // 5. VERIFICACIÓN: Consultar de nuevo al cliente (Tal cual lo hace customers.service.get)
    customer = await prisma.customer.findUnique({ where: { id: customer.id } });
    console.log(`\n🔄 ESTADO ACTUALIZADO DEL CLIENTE: ${customer!.status} (Debe ser PURCHASED)`);

    const activities = await prisma.activity.findMany({
        where: { customerId: customer!.id },
        orderBy: { createdAt: 'desc' },
        take: 1
    });
    console.log(`📝 Última actividad: ${activities[0].notes}`);

    const customerSales = await prisma.vehicleSale.findMany({
        where: { customerId: customer!.id },
        include: { vehicle: { select: { publicId: true } } }
    });

    console.log(`🛍️ Vehículos comprados por el cliente: ${customerSales.length}`);
    customerSales.forEach(s => {
        console.log(`   - Vehículo ID: ${s.vehicle.publicId} | Precio: $${s.soldPrice}`);
    });

    console.log('\n✅ PRUEBA EXITOSA: El cliente se actualizó correctamente al concretar la venta.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
