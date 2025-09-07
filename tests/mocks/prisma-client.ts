// Functional in-memory Prisma stub for focused runs on Windows.
// Activated via alias in vitest.config.ts when FOCUS_TEST=1

type Dict = Record<string, unknown>;

let idSeq = 1;
const nextId = () => String(idSeq++);

type OrderBy = { createdAt?: 'asc' | 'desc'; exitAt?: 'asc' | 'desc' };

function matchesWhere<T extends Dict>(row: T, where: Dict | undefined): boolean {
  if (!where) return true;
  for (const [k, v] of Object.entries(where)) {
    if (v && typeof v === 'object' && 'gte' in (v as Dict)) {
      const rv = row[k] as unknown;
      const gte = (v as Dict).gte as unknown;
      if (!(rv instanceof Date) || !(gte instanceof Date)) return false;
      if (rv.getTime() < gte.getTime()) return false;
    } else if (row[k] !== v) {
      return false;
    }
  }
  return true;
}

export class PrismaClient {
  // in-memory stores
  private users: Dict[] = [];
  private journalSettingsStore: Dict[] = [];
  private instruments: Dict[] = [];
  private trades: Dict[] = [];
  private tradeTags: Dict[] = [];
  private tradeTagOnTradeStore: Dict[] = [];
  private propEvaluations: Dict[] = [];

  async $connect() {}
  async $disconnect() {}
  $use(): void { /* no-op */ }

  user = {
  create: async ({ data }: { data: Dict }) => {
      const row = { id: data.id ?? nextId(), createdAt: new Date(), updatedAt: new Date(), ...data };
      this.users.push(row);
      return { ...row };
    },
  upsert: async ({ where, update, create }: { where: Dict; update: Dict; create: Dict }) => {
      const found = this.users.find(u => u.id === where.id);
      if (found) {
        Object.assign(found, update, { updatedAt: new Date() });
        return { ...found };
      }
      return this.user.create({ data: create });
    }
  };

  journalSettings = {
  create: async ({ data }: { data: Dict }) => {
      const existing = this.journalSettingsStore.find(j => j.userId === data.userId);
      if (existing) return { ...existing };
      const row = { id: nextId(), createdAt: new Date(), updatedAt: new Date(), ...data };
      this.journalSettingsStore.push(row);
      return { ...row };
    },
  upsert: async ({ where, update, create }: { where: Dict; update: Dict; create: Dict }) => {
      const found = this.journalSettingsStore.find(j => j.userId === where.userId);
      if (found) {
        Object.assign(found, update, { updatedAt: new Date() });
        return { ...found };
      }
      return this.journalSettings.create({ data: create });
    }
  };

  instrument = {
    upsert: async ({ where, update, create }: { where: Dict; update: Dict; create: Dict }) => {
      const found = this.instruments.find(i => i.symbol === where.symbol);
      if (found) {
        Object.assign(found, update, { updatedAt: new Date() });
        return { ...found };
      }
      const row = { id: nextId(), createdAt: new Date(), updatedAt: new Date(), ...create };
      this.instruments.push(row);
      return { ...row };
    },
    create: async ({ data }: { data: Dict }) => {
      const row = { id: nextId(), createdAt: new Date(), updatedAt: new Date(), ...data };
      this.instruments.push(row);
      return { ...row };
    }
  };

  trade = {
    create: async ({ data }: { data: Dict }) => {
      const row = { id: nextId(), deletedAt: null, createdAt: new Date(), updatedAt: new Date(), ...data };
      this.trades.push(row);
      return { ...row };
    },
    deleteMany: async ({ where }: { where: Dict }) => {
      const before = this.trades.length;
      this.trades = this.trades.filter(t => !matchesWhere(t, where));
      return { count: before - this.trades.length };
    },
    findMany: async ({ where, orderBy, include }: { where?: Dict; orderBy?: OrderBy; include?: Dict }) => {
      let result = this.trades.filter(t => matchesWhere(t, where));
      if (orderBy?.exitAt) {
        result.sort((a, b) => (orderBy.exitAt === 'asc'
          ? (a.exitAt as Date).getTime() - (b.exitAt as Date).getTime()
          : (b.exitAt as Date).getTime() - (a.exitAt as Date).getTime()));
      }
      // shallow include support for instrument.select
      const inc = include as { instrument?: { select?: Dict } } | undefined;
      const sel = inc?.instrument?.select;
      if (sel && typeof sel === 'object') {
        result = result.map(t => {
          const inst = this.instruments.find(i => i.id === t.instrumentId) || null;
          const selected: Dict = {};
          if (inst) {
            for (const key of Object.keys(sel)) {
              if ((sel as Dict)[key]) selected[key] = inst[key];
            }
          }
          return { ...t, instrument: selected };
        });
      }
      return result.map(r => ({ ...r }));
    }
  };

  tradeTag = {
  findMany: async ({ where, select }: { where: Dict; select?: Dict }) => {
      const rows = this.tradeTags.filter(t => matchesWhere(t, where));
      if (select) return rows.map(r => Object.fromEntries(Object.keys(select).map(k => [k, r[k]])));
      return rows.map(r => ({ ...r }));
    },
  create: async ({ data }: { data: Dict }) => {
      const row = { id: nextId(), createdAt: new Date(), updatedAt: new Date(), ...data };
      this.tradeTags.push(row);
      return { ...row };
    }
  };

  propEvaluation = {
    create: async ({ data, select }: { data: Dict; select?: Dict }) => {
      const row = {
        id: 'pe_' + nextId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        cumulativeProfit: 0,
        peakEquity: 0,
        status: data.status ?? 'ACTIVE',
        ...data
      };
      this.propEvaluations.push(row);
      return select ? Object.fromEntries(Object.keys(select).map(k => [k, (row as Dict)[k]])) : { ...row };
    },
    deleteMany: async ({ where }: { where: Dict }) => {
      const before = this.propEvaluations.length;
      this.propEvaluations = this.propEvaluations.filter(r => !matchesWhere(r, where));
      return { count: before - this.propEvaluations.length };
    },
    findFirst: async ({ where, orderBy, select }: { where?: Dict; orderBy?: OrderBy; select?: Dict }) => {
      const rows = this.propEvaluations.filter(r => matchesWhere(r, where));
      if (orderBy?.createdAt) {
        rows.sort((a, b) => (orderBy.createdAt === 'asc'
          ? (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime()
          : (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime()));
      }
      const row = rows[0] || null;
      if (!row) return null;
      return select ? Object.fromEntries(Object.keys(select).map(k => [k, (row as Dict)[k]])) : { ...row };
    },
    findUnique: async ({ where, select }: { where: Dict; select?: Dict }) => {
      const row = this.propEvaluations.find(r => r.id === where.id) || null;
      if (!row) return null;
      return select ? Object.fromEntries(Object.keys(select).map(k => [k, (row as Dict)[k]])) : { ...row };
    },
    updateMany: async ({ where, data }: { where: Dict; data: Dict }) => {
      let count = 0;
      for (const r of this.propEvaluations) {
        if (matchesWhere(r, where)) {
          Object.assign(r, data, { updatedAt: new Date() });
          count++;
        }
      }
      return { count };
    }
  };
}

export const Prisma: Dict = {};
