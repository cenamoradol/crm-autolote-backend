import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const storeId = 'f4eeee06-df0b-4646-99c7-eff4d8fa63bd'; // Correct Store ID

  console.log('🌱 Seeding Advertisements for store:', storeId);

  // Clear existing ads
  await prisma.advertisement.deleteMany({ where: { storeId } });

  const ads = [
    {
      storeId,
      title: 'Hero Video Ad',
      kind: 'VIDEO',
      imageUrl: 'https://cdn.pixabay.com/video/2016/10/18/5820-185732152_tiny.mp4', 
      targetUrl: 'https://wa.me/50499999999',
      placement: 'HERO',
      isActive: true,
      position: 1,
    },
    {
      storeId,
      title: 'Catalog GIF Ad',
      kind: 'IMAGE',
      imageUrl: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGlvYjdicW80YjdicW80YjdicW80YjdicW80YjdicW80YjdicW8mcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKVUn7iM8FMEU24/giphy.gif',
      targetUrl: 'https://autolote.com/ofertas',
      placement: 'VEHICLE_LIST',
      isActive: true,
      position: 1,
    },
    {
      storeId,
      title: 'Catalog Image Ad',
      kind: 'IMAGE',
      imageUrl: 'https://dummyimage.com/900x600/003366/ffffff&text=Soporte+24/7',
      targetUrl: 'https://wa.me/50499999999',
      placement: 'VEHICLE_LIST',
      isActive: true,
      position: 2,
    },
    {
      storeId,
      title: 'Floating Promo',
      kind: 'IMAGE',
      imageUrl: 'https://dummyimage.com/600x400/ff3300/ffffff&text=Siguenos+en+Tik+Tok',
      targetUrl: 'https://tiktok.com',
      placement: 'FLOATING_BOTTOM',
      isActive: true,
      position: 0,
    }
  ];

  for (const ad of ads) {
    await prisma.advertisement.create({ data: ad as any });
  }

  console.log('✅ Ads seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
