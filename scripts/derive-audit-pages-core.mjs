/** Core logic for deriving affected audit pages. */
export function computeDerivedPages({ changedFiles, map, pagesCfg }) {
  if (!Array.isArray(pagesCfg) || !pagesCfg.length) pagesCfg = ['/'];
  if (!map) return pagesCfg; // no map => all
  const groupHits = new Set();
  for (const [group, paths] of Object.entries(map.groups || {})) {
    if (changedFiles.some(f => paths.some(pfx => f.startsWith(pfx)))) groupHits.add(group);
  }
  const BROAD = ['tokens','ui'];
  if (BROAD.some(g => groupHits.has(g))) return pagesCfg; // broad impact
  const affected = new Set();
  for (const [page, deps] of Object.entries(map.pageDependencies || {})) {
    if (deps.some(d => groupHits.has(d))) affected.add(page);
  }
  if (!affected.size) affected.add('/');
  return Array.from(affected);
}
