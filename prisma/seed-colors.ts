import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding initial colors...');

    const defaultColors = [
        "Blanco",
        "Negro",
        "Gris",
        "Plata",
        "Azul",
        "Rojo"
    ];

    let createdCount = 0;

    for (const colorName of defaultColors) {
        const existing = await prisma.color.findFirst({
            where: { name: { equals: colorName, mode: 'insensitive' } }
        });

        if (!existing) {
            await prisma.color.create({
                data: { name: colorName }
            });
            createdCount++;
            console.log(`Created color: ${colorName}`);
        }
    }

    console.log(`Finished creating ${createdCount} default colors.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
