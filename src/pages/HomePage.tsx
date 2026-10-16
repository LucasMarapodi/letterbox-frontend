import type { FormEvent, ReactElement, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useServices } from '../services/ServiceProvider';
import { GameCard } from '../components/GameCard';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { CatalogNotice } from '../components/CatalogNotice';
import { CatalogLoadingOverlay } from '../components/CatalogLoadingOverlay';
import { HttpFailure } from '../services/http/client';
import type { GamePage, GameQuery, GameSort } from '../services/contracts';

type CatalogState = { status: 'loading'; data: GamePage | null; blocking: boolean; focus?: HTMLElement | null }
  | { status: 'error'; data: GamePage | null; integration: boolean; retryBlocking: boolean }
  | { status: 'ready'; data: GamePage };

export function HomePage({ authenticated = false, feed }: { authenticated?: boolean; feed?: ReactNode }): ReactElement {
  const { games } = useServices();
  const [state, setState] = useState<CatalogState>({ status: 'loading', data: null, blocking: false });
  const blocking = useRef(false);
  const [attempt, setAttempt] = useState<number>(0);
  const [term, setTerm] = useState<string>('');
  const explicitSort = useRef(false);
  const [query, setQuery] = useState<GameQuery>({ term: '', sort: 'release-desc', page: 1, pageSize: 20 });
  useEffect(() => {
    let active: boolean = true;
    games.list(query).then(
      (data) => { if (active) { blocking.current = false; setState({ status: 'ready', data }); } },
      (error: unknown) => { if (active) {
        blocking.current = false;
        setState(previous => ({ status: 'error', data: previous.data, retryBlocking: previous.status === 'loading' && previous.blocking, integration: error instanceof HttpFailure && [502, 503, 504].includes(error.status ?? 0) }));
      } },
    );
    return () => { active = false; };
  }, [games, attempt, query]);

  function startLoading(block = false): boolean {
    if (blocking.current) return false;
    blocking.current = block;
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setState(previous => ({ status: 'loading', data: block ? previous.data : null, blocking: block, focus }));
    return true;
  }

  function search(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const nextTerm = term.trim();
    const sort = explicitSort.current ? query.sort : nextTerm ? 'name-asc' : 'release-desc';
    if (nextTerm === query.term?.trim() && sort === query.sort && query.page === 1) return;
    if (!startLoading(true)) return;
    setQuery(previous => ({ ...previous, term: nextTerm, page: 1, sort }));
  }

  function clearSearch(): void {
    if (blocking.current) return;
    if (!term.trim() && !query.term?.trim()) return;
    setTerm('');
    if (!query.term?.trim()) return;
    if (!startLoading(true)) return;
    setQuery((previous) => ({ ...previous, term: '', sort: explicitSort.current ? previous.sort : 'release-desc', page: 1 }));
  }

  function changeSort(value: string): void {
    if (value !== 'release-desc' && value !== 'name-asc' && value !== 'name-desc') return;
    const sort: GameSort = value;
    if (blocking.current || sort === query.sort) return;
    explicitSort.current = true;
    startLoading();
    setQuery((previous) => ({ ...previous, sort, page: 1 }));
  }

  function retry(): void {
    if (!startLoading(state.status === 'error' && state.retryBlocking)) return;
    setAttempt((previous) => previous + 1);
  }
  function changePageSize(value: string): void {
    if (value !== '10' && value !== '20' && value !== '50') return;
    const pageSize = Number(value);
    if (pageSize === query.pageSize) return;
    if (!startLoading(true)) return;
    setQuery((previous) => ({ ...previous, pageSize, page: 1 }));
  }
  const data = state.data;
  return <main className="dashboard">
    {state.status === 'loading' && state.blocking && <CatalogLoadingOverlay restoreFocus={state.focus ?? null} />}
    {authenticated ? <section className="dashboard-welcome" aria-labelledby="dashboard-title">
      <span className="eyebrow">SEU PRÓXIMO JOGO COMEÇA AQUI</span>
      <h1 id="dashboard-title">Game Reviews</h1>
    </section> : <section className="dashboard-hero" aria-labelledby="dashboard-title">
      <span className="eyebrow">DESCUBRA. JOGUE. COMPARTILHE.</span>
      <h1 id="dashboard-title">Game Reviews</h1>
      <p className="hero-headline">Cada jogo, uma nova história.</p>
      <p className="hero-description">Explore jogos e descubra novas experiências.</p>
      <Link className="primary-link" to="/cadastro">Comece sua jornada <span aria-hidden="true">↗</span></Link>
    </section>}
    <div className="catalog-toolbar">
    <form className="catalog-search" aria-label="Busca de jogos" onSubmit={search}>
      <TextField label="Buscar jogos" placeholder="Encontre seu próximo jogo…" value={term} onChange={(event) => setTerm(event.target.value)} />
      <Button type="submit">Buscar</Button>{' '}
      <Button onClick={clearSearch}>Limpar busca</Button>
    </form>
    <div className="sort-field">
      <label htmlFor="game-sort">Ordenar por</label>{' '}
      <select id="game-sort" value={query.sort} onChange={(event) => changeSort(event.target.value)}>
        <option value="release-desc">Recentes</option>
        <option value="name-asc">Nome: A–Z</option>
        <option value="name-desc">Nome: Z–A</option>
      </select>
    </div>
    <div className="sort-field">
      <label htmlFor="game-page-size">Itens por página</label>
      <select id="game-page-size" value={query.pageSize} onChange={(event) => changePageSize(event.target.value)}>
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
      </select>
    </div>
    </div>
    <section aria-labelledby="catalog-title" aria-busy={state.status === 'loading'}>
      <h2 id="catalog-title">Jogos</h2>
      {state.status === 'loading' && !state.blocking && <LoadingState message="Carregando jogos…" />}
      {state.status === 'error' && <ErrorState message={state.integration ? 'O catálogo está temporariamente indisponível. Tente novamente.' : 'Não foi possível carregar os jogos.'} onRetry={retry} />}
      {state.status === 'ready' && <CatalogNotice paths={[['games']]} onRetry={retry} />}
      {state.status === 'error' && data && <p>Resultados anteriores; a atualização não foi concluída.</p>}
      {data && <div className="catalog-results" aria-hidden={state.status !== 'ready'} inert={state.status !== 'ready'}>
        <p className="catalog-count" style={{ visibility: state.status === 'ready' ? 'visible' : 'hidden' }}>Exibindo {data.items.length} {data.items.length === 1 ? 'jogo' : 'jogos'} · até {data.pageSize} por página</p>
        {data.items.length
          ? <div className="game-grid">{data.items.map((game) => <GameCard key={game.id} game={game} />)}</div>
          : <EmptyState message={query.term?.trim() ? 'Nenhum jogo encontrado para esta busca.' : 'Nenhum jogo disponível.'} />}
        <nav className="catalog-pagination" aria-label="Páginas do catálogo">
          <Button disabled={state.status !== 'ready' || data.page <= 1} onClick={() => { if (!startLoading()) return; setQuery(current => ({ ...current, page: data.page - 1 })); }}>Anterior</Button>
          <span aria-live="polite">Página {data.page}</span>
          <Button disabled={state.status !== 'ready' || !data.hasNextPage} onClick={() => { if (!startLoading()) return; setQuery(current => ({ ...current, page: data.page + 1 })); }}>Próxima</Button>
        </nav>
      </div>}
    </section>
    {feed}
  </main>;
}
