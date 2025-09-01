// Optional module stub to satisfy TypeScript when 'playwright' is not installed.
// The PDF export route dynamically imports playwright only when ENABLE_PDF_EXPORT=1.
// If you actually enable that flag, install dev dependency: npm i -D playwright
// This ambient declaration prevents TS2307 during type-check.
// Minimal typing (any) to avoid pulling full types when not installed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module 'playwright' { const anyExport: any; export = anyExport; }
