# AI Context & Contribution Guide

Authoritative reference to keep AI-assisted changes consistent, safe, and devoid of hallucinations.

## 1. Project Purpose (Authoritative Summary)
Multi-instrument trading journal that enables traders to log trades, tag them, analyze performance (P/L, win rate, drawdown, expectancy), track goals and enforce risk limits. Must remain configurable (no hard-coded instrument symbols) and mobile friendly.

## 2. Source of Truth Hierarchy
1. Prisma schema (`prisma/schema.prisma`) – database structure & canonical field names.
2. Constants (`lib/constants.ts`) – global invariant lists & limits.
3. Domain logic utilities (`lib/analytics.ts`) – core calculation patterns.
4. Roadmap (`docs/ROADMAP.md`) – approved feature scope & sequencing.
5. This document – AI usage policy & conventions.

If a conflict exists: Prisma schema > constants > analytics > roadmap > other docs.

## 3. Canonical Models & Fields
(Reflect current Prisma schema; update if migrations modify structure.)

### User
- id, email, name?, image?, createdAt, updatedAt
- Relations: trades (Trade[]), journalSettings (JournalSettings?)

### JournalSettings
- baseCurrency, riskPerTradePct, maxDailyLossPct, timezone

### Instrument
- symbol, name, category, currency, tickSize, contractMultiplier?, isActive, createdAt, updatedAt

### Trade
- direction (enum: LONG|SHORT)
- entryPrice, exitPrice?, quantity, leverage?, entryAt, exitAt?, fees, notes?, reason?, lesson?, status (OPEN|CLOSED|CANCELLED)
- Relations: instrumentId, userId, tags (join via TradeTagOnTrade)

### Goal
- type (TOTAL_PNL | TRADE_COUNT | WIN_RATE | PROFIT_FACTOR | EXPECTANCY | AVG_LOSS_CAP | DAILY_GREEN_STREAK | ROLLING_30D_PNL | ROLLING_WINDOW_PNL)
- targetValue (Float)
- period (enum / timeframe)
- windowDays? (Int only for ROLLING_WINDOW_PNL)
- progressValue (Float, recalculated)
- userId, createdAt, updatedAt

### TradeTag / TradeTagOnTrade
- TradeTag: label, color, userId?
- Join: (tradeId, tagId) composite key

Enums:
- TradeDirection: LONG | SHORT
- TradeStatus: OPEN | CLOSED | CANCELLED
 - GoalType: see Goal section above

Constants (from `lib/constants.ts`):
- CURRENCIES: USD, EUR, MYR, GBP, JPY
- DEFAULT_PAGE_SIZE = 25
- MAX_TAGS_PER_TRADE = 8

## 4. Naming Conventions
- Database fields: camelCase (matches Prisma models).
- API JSON: Mirror DB field names (no renaming unless a deliberate DTO layer is created; if so document in this file under "DTO Mappings").
- File names: kebab-case for components (`nav-bar.tsx`), camelCase for functions, PascalCase for React components.
- Avoid introducing synonyms: e.g. always use `entryPrice` (not `openPrice`) and `exitPrice` (not `closePrice`).

## 5. API Design Guidelines
Until a formal OpenAPI spec is added, follow this pattern:
- Base path: `/api/*` via Next.js route handlers.
- Endpoints (planned):
  - `POST /api/trades` (create)
  - `GET /api/trades` (list with filters: instrumentId, dateFrom, dateTo, direction, status, tagIds[], search, cursor)
  - `PATCH /api/trades/:id` (update / close)
  - `DELETE /api/trades/:id` (soft delete if decided)
  - `GET /api/trades/:id`
  - `GET/POST /api/instruments`
  - `GET/POST /api/tags`
  - `GET/PATCH /api/settings`
- Response envelope (planned standard): `{ data: <payload>, error: null }` OR `{ data: null, error: { code, message, details? } }`.
- Always validate request bodies & query params using Zod. Reject unknown fields (strip or error) to prevent silent schema drift.

## 6. Analytics / Calculation Rules
Use `lib/analytics.ts` functions as the single source for repeated metrics logic. Do **not** duplicate P/L, win rate, or expectancy calculations elsewhere—import and extend.

If adding new metric:
1. Create a pure function `(trades: TradeLike[]) => MetricResult`.
2. Add unit tests in `lib/*.test.ts` with edge cases (NO exit, zero quantity, short trade).
3. Update metrics catalog in `docs/ROADMAP.md` and optionally add to `ANALYTICS.md` (future doc).

## 7. Version & Deprecation Handling
- Before using a library feature, confirm current version through package.json + `npm outdated`.
- If encountering a deprecation warning (e.g., Tailwind, Vite, Next), consult official docs via Context7 MCP (resolve library id then fetch docs) before changing code.
- Record major library upgrade impacts in a `docs/CHANGES.md` (to create when first upgrade post-M1 happens).

## 8. Consistency & Anti-Hallucination Guardrails
When AI proposes code:
- MUST check existing file for symbol existence before redefining.
- MUST reuse exported constants & enums instead of retyping literal strings.
- MUST not invent fields (e.g., `pips`, `stopLoss`, `takeProfit`) unless a migration and doc update are explicitly requested.
- If a concept is missing (e.g., risk per trade calculation requires stop price), propose a schema extension with rationale rather than silently adding fields.
- All new components require: clear prop types, default export only if consistent with neighbors, responsive classes, and accessibility considerations.
- Avoid speculative dependencies; justify any new package (performance, security, or strong feature need) in PR description.

## 9. Performance Guidelines
- Prefer batched DB queries over N+1 loops.
- For analytics heavy operations, consider pre-aggregation only after verifying a real performance bottleneck (measure first).
- Use cursor pagination for large trade lists; avoid `skip` with large offsets.

## 10. Security Practices
- Never log secrets or full user tokens.
- Sanitize user-provided text only if rendering as HTML (currently plain text / React escapes by default).
- Ensure protected API endpoints verify session userId matches resource userId.

## 11. Error Handling Pattern
Return early with typed errors:
```ts
return { data: null, error: { code: 'VALIDATION_ERROR', message: 'entryPrice must be > 0' } };
```
Do not throw for expected validation issues; only throw for truly unexpected states (caught by global error boundary/logging).

## 12. Testing Standards
- Unit tests required for every analytics function & critical helpers.
- Trade API tests (integration) should cover: create, filter, update, risk reject path.
- Use deterministic sample data (no randomness) for reproducibility.

## 13. Documentation Update Rules
Any schema change requires updates to:
1. `prisma/schema.prisma`
2. Migration file (auto generated by Prisma)
3. This document (section 3)
4. Roadmap (if it alters milestone scope)
5. Potential analytics doc (if metric-related)

## 14. Known Gaps / TODO for AI Awareness
- Some API endpoints are scaffolded only (see OpenAPI). Avoid referencing unimplemented handlers.
- Role-based authorization beyond simple ownership not yet implemented.
- Risk engine v1 exists (daily loss %, per-trade risk %, consecutive losses). Do not add new risk metrics without schema update plan.
- Goal recalculation is debounce-based; incremental updates not yet optimized for very large trade sets.

## 15. Example Acceptable vs. Unacceptable Changes
| Acceptable | Unacceptable |
|-----------|--------------|
| Add `expectancy` function with tests | Adding `stopLossPrice` field in Trade without migration |
| Refactor trade list to use cursor pagination | Introducing Redux alongside Zustand without justification |
| Introduce caching layer with config toggle | Hard-coding instrument symbol list inside a component |

## 16. AI Change Submission Checklist
Before finalizing changes, verify:
- [ ] Symbols reused (no duplicate enums/strings)
- [ ] Prisma schema untouched unless intentionally migrating
- [ ] Field names match schema exactly (case-sensitive)
- [ ] New code passes `npm run lint` & `npm run test`
- [ ] Docs updated if domain or metrics changed
- [ ] No deprecated API usage (checked via docs / MCP if unsure)

## 17. How to Extend This Doc
Add new sections at the bottom with versioned heading (e.g., `## vNext Additions`) so historical guidance remains intact.

---
_Last updated: 2025-08-31 (post rolling window goals & tooltip)_
