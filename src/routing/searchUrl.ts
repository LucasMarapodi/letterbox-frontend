export type SearchTab = 'pessoas' | 'jogos';
export function searchUrl(q: string, aba: SearchTab = 'pessoas', page = 1): string {
  return `/pesquisa?${new URLSearchParams({ q: q.trim(), aba, page: String(page) })}`;
}
export function readSearchUrl(params: URLSearchParams) {
  const q = (params.get('q') ?? '').trim();
  const aba: SearchTab = params.get('aba') === 'jogos' ? 'jogos' : 'pessoas';
  const raw = params.get('page') ?? '1';
  const value = Number(raw);
  const page = /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(value) && (value - 1) * 20 <= 2_147_483_647 ? value : 1;
  return { q, aba, page };
}
