import { PrismaClient, UserRole, TelephonyProvider } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ============================================
  // 1. Create admin user
  // ============================================
  const adminPassword = await bcrypt.hash('admin123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@signalhunt.com' },
    update: {},
    create: {
      email: 'admin@signalhunt.com',
      passwordHash: adminPassword,
      fullName: 'Admin User',
      role: UserRole.ADMIN,
    },
  });
  console.log(`  ✅ Admin user: ${admin.email}`);

  // ============================================
  // 2. Create test BDR users
  // ============================================
  const bdrPassword = await bcrypt.hash('bdr123456', 12);

  const bdr1 = await prisma.user.upsert({
    where: { email: 'bdr1@signalhunt.com' },
    update: {},
    create: {
      email: 'bdr1@signalhunt.com',
      passwordHash: bdrPassword,
      fullName: 'Alex Johnson',
      role: UserRole.BDR,
    },
  });
  console.log(`  ✅ BDR user: ${bdr1.email}`);

  const bdr2 = await prisma.user.upsert({
    where: { email: 'bdr2@signalhunt.com' },
    update: {},
    create: {
      email: 'bdr2@signalhunt.com',
      passwordHash: bdrPassword,
      fullName: 'Sarah Williams',
      role: UserRole.BDR,
    },
  });
  console.log(`  ✅ BDR user: ${bdr2.email}`);

  // ============================================
  // 3. Create test phone numbers
  // ============================================
  const phone1 = await prisma.phoneNumber.upsert({
    where: {
      number_provider: {
        number: '+441234567890',
        provider: TelephonyProvider.TWILIO,
      },
    },
    update: { assignedUserId: bdr1.id },
    create: {
      number: '+441234567890',
      countryCode: 'GB',
      provider: TelephonyProvider.TWILIO,
      providerSid: 'PN_TEST_1',
      assignedUserId: bdr1.id,
    },
  });
  console.log(`  ✅ Phone number: ${phone1.number} → ${bdr1.fullName}`);

  const phone2 = await prisma.phoneNumber.upsert({
    where: {
      number_provider: {
        number: '+491234567890',
        provider: TelephonyProvider.TWILIO,
      },
    },
    update: { assignedUserId: bdr2.id },
    create: {
      number: '+491234567890',
      countryCode: 'DE',
      provider: TelephonyProvider.TWILIO,
      providerSid: 'PN_TEST_2',
      assignedUserId: bdr2.id,
    },
  });
  console.log(`  ✅ Phone number: ${phone2.number} → ${bdr2.fullName}`);

  // ============================================
  // 4. Create test leads
  // ============================================
  const testLeads = [
    {
      companyName: 'TechStart GmbH',
      contactName: 'Max Mueller',
      contactTitle: 'CTO',
      phoneNumber: '+4915123456789',
      country: 'DE',
      location: 'Berlin',
      headcount: 45,
      companyOverview: 'B2B SaaS company building developer tools for enterprise teams.',
      ownerId: bdr1.id,
    },
    {
      companyName: 'CloudScale Ltd',
      contactName: 'James Smith',
      contactTitle: 'VP Engineering',
      phoneNumber: '+447911123456',
      country: 'GB',
      location: 'London',
      headcount: 120,
      companyOverview: 'Cloud infrastructure provider specializing in auto-scaling solutions.',
      ownerId: bdr1.id,
    },
    {
      companyName: 'DataFlow BV',
      contactName: 'Jan de Vries',
      contactTitle: 'Head of Sales',
      phoneNumber: '+31612345678',
      country: 'NL',
      location: 'Amsterdam',
      headcount: 80,
      companyOverview: 'Data pipeline automation company serving mid-market enterprises.',
      ownerId: bdr2.id,
    },
    {
      companyName: 'InnovateTech SA',
      contactName: 'Pierre Dubois',
      contactTitle: 'CEO',
      phoneNumber: '+33612345678',
      country: 'FR',
      location: 'Paris',
      headcount: 200,
      companyOverview: 'AI-powered business intelligence platform for retail industry.',
      ownerId: bdr2.id,
    },
  ];

  for (const lead of testLeads) {
    // Check if lead with same phone already exists
    const existing = await prisma.lead.findFirst({
      where: { phoneNumber: lead.phoneNumber },
    });

    if (!existing) {
      const created = await prisma.lead.create({ data: lead });
      console.log(`  ✅ Lead: ${created.companyName} (${created.contactName})`);
    } else {
      console.log(`  ⏭️  Lead already exists: ${lead.companyName}`);
    }
  }

  console.log('\n🎉 Seed completed!');
  console.log('\n📋 Test credentials:');
  console.log('   Admin: admin@signalhunt.com / admin123456');
  console.log('   BDR 1: bdr1@signalhunt.com / bdr123456');
  console.log('   BDR 2: bdr2@signalhunt.com / bdr123456');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
