export interface AuditMap {
	groups?: Record<string, string[]>;
	pageDependencies?: Record<string, string[]>;
	[k: string]: unknown;
}
export interface DeriveArgs { changedFiles: string[]; map: AuditMap | null; pagesCfg: string[]; }
export function computeDerivedPages(args: DeriveArgs): string[];