const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Production deployment supplies these once through a short-lived seed environment.
// Keeping them empty by default prevents a later deploy from recreating a known account.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

async function main() {
  const [existingUser, existingSettings] = await Promise.all([
    ADMIN_EMAIL ? prisma.user.findUnique({ where: { email: ADMIN_EMAIL } }) : null,
    prisma.appSettings.findFirst(),
  ]);
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log('Skipping initial admin bootstrap: no deployment credentials supplied');
  } else if (existingUser) {
    console.log('Admin user already exists:', ADMIN_EMAIL);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash,
        fullName: 'Lahda Admin',
        role: 'admin',
      },
    });
    console.log('Created admin user:', ADMIN_EMAIL);
  }
  if (!existingSettings) {
    const defaultPricingConfig = {
      appFee: {
        threshold: 15000,
        belowThreshold: 250,
        aboveThreshold: 500,
      },
      distanceBands: [
        { minKm: 0, maxKm: 5, fee: 1000 },
        { minKm: 5, maxKm: 7, fee: 1500 },
        { minKm: 7, maxKm: 10, fee: 2000 },
        { minKm: 10, maxKm: null, fee: 2500 },
      ],
    };
    await prisma.appSettings.create({
      data: {
        appNameAr: 'لحظة',
        appNameEn: 'Lahda',
        pricingConfig: defaultPricingConfig,
      },
    });
    console.log('Created default app settings with pricing config');
  } else if (!existingSettings.pricingConfig) {
    const defaultPricingConfig = {
      appFee: {
        threshold: 15000,
        belowThreshold: 250,
        aboveThreshold: 500,
      },
      distanceBands: [
        { minKm: 0, maxKm: 5, fee: 1000 },
        { minKm: 5, maxKm: 7, fee: 1500 },
        { minKm: 7, maxKm: 10, fee: 2000 },
        { minKm: 10, maxKm: null, fee: 2500 },
      ],
    };
    await prisma.appSettings.update({
      where: { id: existingSettings.id },
      data: { pricingConfig: defaultPricingConfig },
    });
    console.log('Updated app settings with default pricing config');
  }

  if (process.env.SEED_DEMO_DATA !== '1') {
    console.log('Skipping demo accounts, merchants, and products');
    return;
  }

  // Test driver account (for local/demo environments only)
  const DRIVER_EMAIL = 'driver@lahda.app';
  const DRIVER_PASSWORD = 'Driver123!';
  let driverUser = await prisma.user.findUnique({ where: { email: DRIVER_EMAIL } });
  if (!driverUser) {
    const driverHash = await bcrypt.hash(DRIVER_PASSWORD, 10);
    driverUser = await prisma.user.create({
      data: {
        email: DRIVER_EMAIL,
        passwordHash: driverHash,
        fullName: 'سائق تجريبي',
        phone: '+9647700000001',
        role: 'driver',
        isActive: true,
      },
    });
    await prisma.driverProfile.create({
      data: { userId: driverUser.id, isApproved: true },
    });
    console.log('Created test driver:', DRIVER_EMAIL, '| password:', DRIVER_PASSWORD);
  } else {
    const profile = await prisma.driverProfile.findUnique({ where: { userId: driverUser.id } });
    if (profile && !profile.isApproved) {
      await prisma.driverProfile.update({
        where: { id: profile.id },
        data: { isApproved: true },
      });
      console.log('Test driver approved:', DRIVER_EMAIL);
    }
  }

  const categories = [
    { nameAr: 'برغر', nameEn: 'Burgers', slug: 'burgers', sortOrder: 1 },
    { nameAr: 'حلويات', nameEn: 'Desserts', slug: 'desserts', sortOrder: 2 },
    { nameAr: 'بيتزا', nameEn: 'Pizza', slug: 'pizza', sortOrder: 3 },
  ];
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nameAr: c.nameAr, nameEn: c.nameEn, sortOrder: c.sortOrder, isActive: true },
      create: { ...c, isActive: true },
    });
  }

  const demos = [
    {
      ownerEmail: 'merchant1@lahda.app',
      ownerName: 'Burger Maker Owner',
      storeName: 'برجر ميكرز',
      storeSlug: 'burger-makers',
      logoUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400',
      coverUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200',
      deliveryFee: 100,
      hasOffers: true,
      ratingAvg: 4.8,
      ratingCount: 294,
      estimatedDeliveryMin: 20,
      estimatedDeliveryMax: 30,
      discountLabel: 'خصم 15%',
      categories: ['burgers'],
      products: [
        { nameAr: 'برغر سموكد بالعسل', price: 1050, isAvailable: true },
        { nameAr: 'برغر سموكد بالباربيكيو', price: 1050, isAvailable: true },
      ],
    },
    {
      ownerEmail: 'merchant2@lahda.app',
      ownerName: 'Lokmacho Owner',
      storeName: 'لوكماجو - العامرية',
      storeSlug: 'lokmacho-amiria',
      logoUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400',
      coverUrl: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=1200',
      deliveryFee: 120,
      hasOffers: true,
      ratingAvg: 4.6,
      ratingCount: 210,
      estimatedDeliveryMin: 25,
      estimatedDeliveryMax: 35,
      discountLabel: 'خصم 30%',
      categories: ['desserts'],
      products: [
        { nameAr: 'لوكماجو دبلفيري', price: 900, isAvailable: true },
        { nameAr: 'ميني لوكماجو', price: 700, isAvailable: true },
      ],
    },
    {
      ownerEmail: 'merchant3@lahda.app',
      ownerName: 'Pizza Max Owner',
      storeName: 'بيتزا ماكس',
      storeSlug: 'pizza-max',
      logoUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
      coverUrl: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=1200',
      deliveryFee: 0,
      hasOffers: false,
      ratingAvg: 4.4,
      ratingCount: 110,
      estimatedDeliveryMin: 30,
      estimatedDeliveryMax: 40,
      discountLabel: null,
      categories: ['pizza'],
      products: [
        { nameAr: 'بيتزا مارجريتا', price: 1200, isAvailable: true },
        { nameAr: 'بيتزا بيبروني', price: 1450, isAvailable: true },
      ],
    },
  ];

  for (const demo of demos) {
    let merchantUser = await prisma.user.findUnique({ where: { email: demo.ownerEmail } });
    if (!merchantUser) {
      const passwordHash = await bcrypt.hash('Merchant123!', 10);
      merchantUser = await prisma.user.create({
        data: {
          email: demo.ownerEmail,
          passwordHash,
          fullName: demo.ownerName,
          role: 'merchant',
          isActive: true,
        },
      });
    }

    const profile = await prisma.merchantProfile.upsert({
      where: { storeSlug: demo.storeSlug },
      update: {
        userId: merchantUser.id,
        storeName: demo.storeName,
        logoUrl: demo.logoUrl,
        coverUrl: demo.coverUrl,
        isApproved: true,
        isOpen: true,
        deliveryFee: demo.deliveryFee,
        hasOffers: demo.hasOffers,
        ratingAvg: demo.ratingAvg,
        ratingCount: demo.ratingCount,
        estimatedDeliveryMin: demo.estimatedDeliveryMin,
        estimatedDeliveryMax: demo.estimatedDeliveryMax,
        discountLabel: demo.discountLabel || undefined,
      },
      create: {
        userId: merchantUser.id,
        storeName: demo.storeName,
        storeSlug: demo.storeSlug,
        logoUrl: demo.logoUrl,
        coverUrl: demo.coverUrl,
        isApproved: true,
        isOpen: true,
        deliveryFee: demo.deliveryFee,
        hasOffers: demo.hasOffers,
        ratingAvg: demo.ratingAvg,
        ratingCount: demo.ratingCount,
        estimatedDeliveryMin: demo.estimatedDeliveryMin,
        estimatedDeliveryMax: demo.estimatedDeliveryMax,
        discountLabel: demo.discountLabel || undefined,
      },
    });

    await prisma.storeCategory.deleteMany({ where: { merchantProfileId: profile.id } });
    for (const slug of demo.categories) {
      const cat = await prisma.category.findUnique({ where: { slug } });
      if (cat) {
        await prisma.storeCategory.create({
          data: { merchantProfileId: profile.id, categoryId: cat.id },
        });
      }
    }

    for (const p of demo.products) {
      const existing = await prisma.product.findFirst({
        where: { merchantProfileId: profile.id, nameAr: p.nameAr },
      });
      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { price: p.price, isAvailable: p.isAvailable },
        });
      } else {
        await prisma.product.create({
          data: {
            merchantProfileId: profile.id,
            nameAr: p.nameAr,
            price: p.price,
            isAvailable: p.isAvailable,
          },
        });
      }
    }
  }

  console.log('Seeded demo merchants and products');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
