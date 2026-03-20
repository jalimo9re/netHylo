import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Plan, PlanName } from '../entities/plan.entity';
import { User, UserRole } from '../entities/user.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'nethylo',
  password: process.env.DB_PASSWORD || 'nethylo_secret',
  database: process.env.DB_NAME || 'nethylo',
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  synchronize: true,
});

async function seed() {
  await dataSource.initialize();
  console.log('Database connected');

  const planRepo = dataSource.getRepository(Plan);
  const userRepo = dataSource.getRepository(User);

  // Seed Plans
  const plans = [
    { name: PlanName.BASIC, maxUsers: 1, maxIntegrations: 2, price: 0 },
    { name: PlanName.MEDIUM, maxUsers: 5, maxIntegrations: 10, price: 49.99 },
    { name: PlanName.FULL, maxUsers: -1, maxIntegrations: -1, price: 149.99 },
  ];

  for (const planData of plans) {
    const exists = await planRepo.findOne({ where: { name: planData.name } });
    if (!exists) {
      await planRepo.save(planRepo.create(planData));
      console.log(`Plan "${planData.name}" created`);
    }
  }

  // Seed Superadmin
  const superadminEmail = process.env.SUPERADMIN_EMAIL || 'admin@nethylo.com';
  const existingSuperadmin = await userRepo.findOne({
    where: { email: superadminEmail, role: UserRole.SUPERADMIN },
  });

  if (!existingSuperadmin) {
    const passwordHash = await bcrypt.hash(
      process.env.SUPERADMIN_PASSWORD || 'Admin123!',
      12,
    );
    await userRepo.save(
      userRepo.create({
        email: superadminEmail,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        role: UserRole.SUPERADMIN,
        tenantId: null,
      }),
    );
    console.log(`Superadmin "${superadminEmail}" created`);
  }

  await dataSource.destroy();
  console.log('Seed completed');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
