import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DIAGNÓSTICO DE USUARIOS ---');
    const users = await prisma.user.findMany({
        select: {
            email: true,
            isSuperAdmin: true,
            isActive: true
        }
    });
    console.log(JSON.stringify(users, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
