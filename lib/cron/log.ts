import { prisma } from '@/lib/prisma';

async function ensureTable(){
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CronRun" (
    id text PRIMARY KEY,
    job_name text NOT NULL,
    ran_at timestamptz NOT NULL DEFAULT now(),
    status text NOT NULL,
    duration_ms integer,
    detail text,
    created_at timestamptz NOT NULL DEFAULT now()
  );`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CronRun_job_name_ran_at_idx" ON "CronRun" (job_name, ran_at);`);
}

export async function recordCronRun(jobName: string, status: 'success' | 'failure', durationMs: number, detail?: string){
  try {
    await ensureTable();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "CronRun" (id, job_name, status, duration_ms, detail) VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
      jobName,
      status,
      durationMs,
      (detail || '').slice(0, 5000)
    );
  } catch { /* ignore */ }
}

export async function recentCronRuns(jobName?: string, limit = 20){
  try {
    await ensureTable();
    if(jobName){
      return await prisma.$queryRawUnsafe(`SELECT job_name as "jobName", ran_at as "ranAt", status, duration_ms as "durationMs", detail FROM "CronRun" WHERE job_name = $1 ORDER BY ran_at DESC LIMIT ${limit}`, jobName) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    }
    return await prisma.$queryRawUnsafe(`SELECT job_name as "jobName", ran_at as "ranAt", status, duration_ms as "durationMs", detail FROM "CronRun" ORDER BY ran_at DESC LIMIT ${limit}`) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  } catch {
    return [];
  }
}