import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED_PROD !== 'true') {
    console.log('Refusing to seed in production without ALLOW_SEED_PROD=true');
    return;
  }
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  if (!email || !password) {
    console.log('Missing SEED_USER_EMAIL or SEED_USER_PASSWORD; aborting user seed.');
  }
  let userId;
  if (email && password) {
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash: hash, role: 'ADMIN' }
    });
    userId = user.id;
    await prisma.journalSettings.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id }
    });
  }

  const instruments = [
    { symbol: 'ES', name: 'E-Mini S&P 500', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 50 },
    { symbol: 'NQ', name: 'E-Mini Nasdaq 100', category: 'Futures', currency: 'USD', tickSize: 0.25, contractMultiplier: 20 },
    { symbol: 'GC', name: 'Gold Futures', category: 'Futures', currency: 'USD', tickSize: 0.1, contractMultiplier: 100 },
    { symbol: 'BTCUSD', name: 'Bitcoin', category: 'Crypto', currency: 'USD', tickSize: 1 },
    { symbol: 'EURUSD', name: 'Euro / US Dollar', category: 'Forex', currency: 'USD', tickSize: 0.0001 }
  ];
  for (const inst of instruments) {
    await prisma.instrument.upsert({ where: { symbol: inst.symbol }, update: {}, create: inst });
  }

  if (userId) {
    const tags = [
      { label: 'Setup:A', color: '#3b82f6' },
      { label: 'Emotion:FOMO', color: '#ef4444' },
      { label: 'Playbook:Breakout', color: '#6366f1' }
    ];
    for (const t of tags) {
      await prisma.tradeTag.upsert({
        where: { id: `${userId}-${t.label}` },
        update: {},
        create: { label: t.label, color: t.color, userId }
      }).catch(async () => {
        // fallback: try find existing by label
        const existing = await prisma.tradeTag.findFirst({ where: { label: t.label, userId } });
        if (!existing) await prisma.tradeTag.create({ data: { label: t.label, color: t.color, userId } });
      });
    }

    // Seed a couple of current period goals if none exist
    const existingGoals = await prisma.goal.count({ where: { userId } });
    if (existingGoals === 0) {
      const now = new Date();
      const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()+1, 0, 23,59,59));
      await prisma.goal.createMany({ data: [
        { userId, type: 'TOTAL_PNL', period: 'MONTH', targetValue: 2000, currentValue: 0, startDate: startOfMonth, endDate: endOfMonth },
        { userId, type: 'TRADE_COUNT', period: 'MONTH', targetValue: 50, currentValue: 0, startDate: startOfMonth, endDate: endOfMonth },
        { userId, type: 'WIN_RATE', period: 'MONTH', targetValue: 55, currentValue: 0, startDate: startOfMonth, endDate: endOfMonth }
      ] });
      console.log('Seeded sample goals');
    }
  }

  console.log('Seed complete');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
