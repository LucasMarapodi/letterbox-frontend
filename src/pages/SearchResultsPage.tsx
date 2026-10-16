import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useServices } from '../services/ServiceProvider';
import { validSearchTerm, type SearchGroup, type SearchPerson, type SearchGame } from '../services/searchContracts';
import { readSearchUrl, searchUrl, type SearchTab } from '../routing/searchUrl';
import { encodeRouteId } from '../routing/encodeRouteId';
import { Avatar } from '../components/Avatar';
import { GameCover } from '../components/GameCover';
import { Button } from '../components/Button';
import { ErrorState, LoadingState } from '../components/Feedback';

type View = { key: string; people: SearchGroup<SearchPerson> | null; games: SearchGroup<SearchGame> | null };
const failure = { status: 'unavailable' as const, items: [], page: null, pageSize: null, hasNextPage: null, error: { code: 'unavailable', message: 'Busca indisponível.' }, metadata: null };
export function SearchResultsPage() {
  const { search } = useServices();
  const location = useLocation();
  const navigate = useNavigate();
  const { q, aba, page } = readSearchUrl(new URLSearchParams(location.search));
  const valid = validSearchTerm(q);
  const canonical = searchUrl(q, aba, page);
  const kind = aba === 'pessoas' ? 'people' : 'games';
  const cacheKey = JSON.stringify([q, page]);
  const viewKey = `${kind}-${cacheKey}`;
  const cache = useRef({ people: new Map<string, SearchGroup<SearchPerson>>(), games: new Map<string, SearchGroup<SearchGame>>() });
  const [view, setView] = useState<View | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { if (`${location.pathname}${location.search}` !== canonical) navigate(canonical, { replace: true }); }, [canonical, location.pathname, location.search, navigate]);
  useEffect(() => {
    if (!valid || !search) return;
    const maps = cache.current;
    const show = () => setView({ key: viewKey, people: maps.people.get(cacheKey) ?? null, games: maps.games.get(cacheKey) ?? null });
    if (maps[kind].has(cacheKey)) { show(); return; }
    const scope = page === 1 && !maps.people.has(cacheKey) && !maps.games.has(cacheKey) ? 'all' : kind;
    let active = true;
    const controller = new AbortController();
    show();
    void (async () => {
      // O primeiro efeito do StrictMode é limpo antes desta microtask.
      await Promise.resolve();
      if (!active) return;
      try {
        const result = await search.search({ q, mode: 'results', scope, page }, controller.signal);
        if (!active) return;
        if (result.people.status !== 'notRequested') maps.people.set(cacheKey, result.people);
        if (result.games.status !== 'notRequested') maps.games.set(cacheKey, result.games);
      } catch {
        if (!active) return;
        if (scope !== 'games') maps.people.set(cacheKey, failure);
        if (scope !== 'people') maps.games.set(cacheKey, failure);
      }
      show();
    })();
    return () => { active = false; controller.abort(); };
  }, [q, kind, page, cacheKey, viewKey, attempt, search, valid]);
  const current = view?.key === viewKey ? view : null;
  const group = current?.[kind];
  const loading = valid && !group;
  function retry() { cache.current[kind].delete(cacheKey); setView(null); setAttempt(previous => previous + 1); }
  function tab(next: SearchTab) { if (aba !== next) navigate(searchUrl(q, next, 1)); }
  return <main className="search-results">
    <span className="eyebrow">PESSOAS E JOGOS</span>
    <h1>Pesquisa</h1>
    {valid ? <p>Resultados para <strong>{q}</strong></p> : <p role="status">Digite pelo menos 3 caracteres.</p>}
    {valid && <>
      <div role="tablist" aria-label="Categorias da pesquisa" className="search-tabs">
        {(['pessoas', 'jogos'] as const).map(value => <Button id={`search-tab-${value}`} role="tab" aria-selected={aba === value} aria-controls="search-results-panel" tabIndex={aba === value ? 0 : -1} key={value}
          onClick={() => tab(value)} onKeyDown={event => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
              event.preventDefault();
              const next = event.key === 'Home' ? 'pessoas' : event.key === 'End' ? 'jogos' : aba === 'pessoas' ? 'jogos' : 'pessoas';
              tab(next); document.getElementById(`search-tab-${next}`)?.focus({ preventScroll: true });
            }
          }}>{value === 'pessoas' ? 'Pessoas' : 'Jogos'}</Button>)}
      </div>
      <section id="search-results-panel" role="tabpanel" tabIndex={0} aria-labelledby={`search-tab-${aba}`} aria-busy={loading}>
        {loading && <LoadingState message={`Carregando ${aba === 'pessoas' ? 'Pessoas' : 'Jogos'}…`} />}
        {group?.status === 'unavailable' && <ErrorState message={`Não foi possível carregar ${aba === 'pessoas' ? 'Pessoas' : 'Jogos'}.`} onRetry={retry} />}
        {group?.status === 'ready' && <>
          {group.metadata?.isStale && <p>Dados de Jogos desatualizados. Última obtenção: <time dateTime={group.metadata.fetchedAt}>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' }).format(new Date(group.metadata.fetchedAt))} (UTC)</time>.</p>}
          <p>Exibindo {group.items.length} {aba === 'pessoas' ? 'pessoas' : 'jogos'} · até 20 por página</p>
          {!group.items.length && <p role="status">{aba === 'pessoas' ? 'Nenhuma pessoa encontrada.' : 'Nenhum jogo encontrado.'}</p>}
          {aba === 'pessoas' && current?.people?.status === 'ready' && <ul className="search-result-list">{current.people.items.map(person => <li key={person.id}>
            <Avatar name={person.displayName} src={person.avatarUrl} /><Link to={`/perfil/${encodeRouteId(person.id)}`}><strong>{person.displayName}</strong><span>@{person.username}</span></Link>
          </li>)}</ul>}
          {aba === 'jogos' && current?.games?.status === 'ready' && <ul className="search-result-list">{current.games.items.map(game => <li key={game.id}>
            <GameCover title={game.title} src={game.coverUrl} className="search-result-cover" decorative /><div><Link to={`/jogos/${encodeRouteId(game.id)}`}><strong>{game.title}</strong></Link><p>{game.summary.trim() || 'Resumo não informado.'}</p></div>
          </li>)}</ul>}
          <nav aria-label="Páginas da pesquisa" className="catalog-pagination">
            <Button disabled={page <= 1} onClick={() => navigate(searchUrl(q, aba, page - 1))}>Anterior</Button><span aria-live="polite">Página {page}</span>
            <Button disabled={!group.hasNextPage} onClick={() => navigate(searchUrl(q, aba, page + 1))}>Próxima</Button>
          </nav>
        </>}
      </section>
    </>}
  </main>;
}
