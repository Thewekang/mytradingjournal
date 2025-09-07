// Lightweight stub for @prisma/client used by focus-only UI tests.
// Provides a minimal PrismaClient class surface to satisfy imports without
// triggering native engine download / initialization (which causes EPERM
// rename errors on Windows in constrained environments).
// Extend as needed if additional properties get referenced.
export class PrismaClient {
  $connect() { /* no-op */ }
  $disconnect() { /* no-op */ }
  // Generic model proxies return chainable no-op handlers to satisfy calls.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _proxy(): any { return new Proxy(()=>{}, { apply: () => Promise.resolve(undefined) }); }
  get journalSettings() { return { upsert: async () => ({}) }; }
  get instrument() { return { upsert: async () => ({}) }; }
  get tradeTag() { return { findMany: async () => [], create: async () => ({}) }; }
}
export const Prisma = {} as const;
