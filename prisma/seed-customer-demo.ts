import { PrismaClient, Model } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Find the first store
    const store = await prisma.store.findFirst();
    if (!store) throw new Error('No store found. Seed a store first.');

    // Find the first user (for activity createdBy)
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No user found. Seed a user first.');

    // Find brands
    const toyota = await prisma.brand.findFirst({ where: { name: { contains: 'Toyota', mode: 'insensitive' } } });
    const honda = await prisma.brand.findFirst({ where: { name: { contains: 'Honda', mode: 'insensitive' } } });
    const nissan = await prisma.brand.findFirst({ where: { name: { contains: 'Nissan', mode: 'insensitive' } } });

    // Find models
    let corolla: Model | null = null, crv: Model | null = null, sentra: Model | null = null;
    if (toyota) corolla = await prisma.model.findFirst({ where: { brandId: toyota.id, name: { contains: 'Corolla', mode: 'insensitive' } } });
    if (honda) crv = await prisma.model.findFirst({ where: { brandId: honda.id, name: { contains: 'CR-V', mode: 'insensitive' } } });
    if (nissan) sentra = await prisma.model.findFirst({ where: { brandId: nissan.id, name: { contains: 'Sentra', mode: 'insensitive' } } });

    console.log('Brands found:', { toyota: toyota?.name, honda: honda?.name, nissan: nissan?.name });
    console.log('Models found:', { corolla: corolla?.name, crv: crv?.name, sentra: sentra?.name });

    // Create customer
    const customer = await prisma.customer.create({
        data: {
            storeId: store.id,
            fullName: 'Carlos Hernández (Demo)',
            phone: '+504 9876-5432',
            email: 'carlos.hernandez@demo.com',
            status: 'CONTACTED',
        },
    });
    console.log('Customer created:', customer.id, customer.fullName);

    // Create 3 preferences
    const pref1 = await prisma.customerPreference.create({
        data: {
            storeId: store.id,
            customerId: customer.id,
            brandId: toyota?.id || null,
            modelId: corolla?.id || null,
            yearFrom: 2010,
            yearTo: 2015,
            notes: 'Prefiere color blanco o gris',
            isActive: true,
        },
    });
    console.log('Preference 1 (Toyota Corolla 2010-2015):', pref1.id);

    const pref2 = await prisma.customerPreference.create({
        data: {
            storeId: store.id,
            customerId: customer.id,
            brandId: honda?.id || null,
            modelId: crv?.id || null,
            yearFrom: 2015,
            yearTo: 2016,
            notes: 'Interesado en versión 4x4',
            isActive: true,
        },
    });
    console.log('Preference 2 (Honda CRV 2015-2016):', pref2.id);

    const pref3 = await prisma.customerPreference.create({
        data: {
            storeId: store.id,
            customerId: customer.id,
            brandId: nissan?.id || null,
            modelId: sentra?.id || null,
            yearFrom: 2018,
            yearTo: 2020,
            notes: 'Ya no le interesa, compró otro',
            isActive: false,
        },
    });
    console.log('Preference 3 (Nissan Sentra 2018 - INACTIVA):', pref3.id);

    // Create 3 activities
    const act1 = await prisma.activity.create({
        data: {
            storeId: store.id,
            type: 'CALL',
            notes: 'Llamada inicial. El cliente mostró interés en Toyota Corolla y Honda CRV. Preguntó por disponibilidad y precios.',
            customerId: customer.id,
            createdByUserId: user.id,
            createdAt: new Date('2026-02-20T10:30:00'),
        },
    });
    console.log('Activity 1 (Call):', act1.id);

    const act2 = await prisma.activity.create({
        data: {
            storeId: store.id,
            type: 'WHATSAPP',
            notes: 'Se enviaron fotos de un CRV 2016 disponible en el lote. Cliente vio los mensajes pero no respondió.',
            customerId: customer.id,
            createdByUserId: user.id,
            createdAt: new Date('2026-02-23T14:15:00'),
        },
    });
    console.log('Activity 2 (WhatsApp):', act2.id);

    const act3 = await prisma.activity.create({
        data: {
            storeId: store.id,
            type: 'CALL',
            notes: 'Se llamó nuevamente. Dijo que aún le interesa el Corolla pero está esperando su quincena para dar el enganche. Programar seguimiento para la próxima semana.',
            customerId: customer.id,
            createdByUserId: user.id,
            createdAt: new Date('2026-02-26T09:00:00'),
        },
    });
    console.log('Activity 3 (Call follow-up):', act3.id);

    console.log('\n✅ Demo customer created successfully!');
    console.log(`   Customer: ${customer.fullName}`);
    console.log(`   Preferences: 3 (2 active, 1 inactive)`);
    console.log(`   Activities: 3 (2 calls, 1 whatsapp)`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
