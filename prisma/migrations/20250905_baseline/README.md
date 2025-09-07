# 20250905 Baseline Migration (Dev Reset)

This baseline consolidates all prior migrations after schema drift issues (shadow DB missing earlier tables like `ExportJob`).

USE ONLY FOR A DEV RESET.

Procedure to apply (manual):
1. Confirm target database is disposable (development only).
2. Backup anything needed.
3. Drop all existing tables OR set a fresh DATABASE_URL pointing to a new empty dev DB.
4. Delete older migration folders (or archive) if you intend to rely solely on this baseline going forward.
5. Run `npx prisma migrate dev --name baseline-reset` (Prisma will replay existing migrations; adjust if you removed them by editing `migration_lock.toml`).
6. Run `npx prisma generate`.
7. Remove any `as any` / loose typing related to `lastEquityValidationAt` and `lastEquityRebuildAt`.

If you need to preserve existing production data DO NOT APPLY THIS. Instead craft incremental migrations to reconcile missing tables.
