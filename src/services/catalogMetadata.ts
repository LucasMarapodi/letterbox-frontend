export interface CatalogMetadata { stale: boolean; fetchedAt: string | null; }
export type CatalogSnapshot = Readonly<Record<string, CatalogMetadata>>;
export interface CatalogStore {
  subscribe(listener: () => void): () => void;
  snapshot(): CatalogSnapshot;
  begin(key: string): number;
  finish(key: string, sequence: number, metadata: CatalogMetadata | null): void;
  clear(): void;
}
export function catalogKey(path: readonly string[]): string { return path.map(encodeURIComponent).join('/'); }
export function readCatalogMetadata(headers: Headers): CatalogMetadata | null {
  const stale = headers.get('X-Catalog-Stale');
  if (stale !== 'true' && stale !== 'false') return null;
  const date = headers.get('X-Catalog-Fetched-At');
  const valid = date !== null && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|\+00:00)$/.test(date) &&
    Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date.slice(0, 10);
  return { stale: stale === 'true', fetchedAt: valid ? date : null };
}
/** Metadados de resposta, separados de entidades e sem cache de negócio. */
export function createCatalogStore(): CatalogStore {
  let data: CatalogSnapshot = {};
  let sequence = 0;
  const pending = new Map<string, number>();
  const listeners = new Set<() => void>();
  const notify = (): void => { for (const listener of listeners) listener(); };
  return {
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    snapshot: () => data,
    begin(key) {
      const current = ++sequence;
      pending.delete(key); pending.set(key, current);
      if (pending.size > 100) { const oldest = pending.keys().next().value; if (oldest !== undefined) pending.delete(oldest); }
      if (key in data) { const next = { ...data }; delete next[key]; data = next; notify(); }
      return current;
    },
    finish(key, current, metadata) {
      if (pending.get(key) !== current) return;
      if (metadata) { data = { ...data, [key]: metadata }; }
      const keys = Object.keys(data);
      if (keys.length > 100) { const next = { ...data }; delete next[keys[0]]; data = next; }
      notify();
    },
    clear() { pending.clear(); data = {}; notify(); },
  };
}
