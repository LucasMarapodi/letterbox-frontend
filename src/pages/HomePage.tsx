import type { FormEvent, ReactElement } from 'react';
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
import type { GamePage, GameQuery, GameSort, CatalogFilters } from '../services/contracts';

type CatalogState = { status: 'loading'; data: GamePage | null; blocking: boolean; focus?: HTMLElement | null }
  | { status: 'error'; data: GamePage | null; integration: boolean; invalidFilter: boolean; retryBlocking: boolean }
  | { status: 'ready'; data: GamePage };
type Draft = Pick<GameQuery, 'genreId' | 'platformId'> & { term: string; sort: GameSort };
const defaults: Draft = { term: '', sort: 'release-desc' };

export function HomePage({ authenticated = false }: { authenticated?: boolean }): ReactElement {
  const { games } = useServices();
  const [state, setState] = useState<CatalogState>({ status: 'loading', data: null, blocking: false });
  const blocking = useRef(false);
  const [attempt, setAttempt] = useState<number>(0);
  const [draft, setDraft] = useState<Draft>(defaults);
  const [options, setOptions] = useState<{ status: 'loading' | 'error' } | { status: 'ready'; data: CatalogFilters }>({ status: 'loading' });
  const [optionsAttempt, setOptionsAttempt] = useState(0);
  const [query, setQuery] = useState<GameQuery>({ term: '', sort: 'release-desc', page: 1, pageSize: 20 });
  useEffect(() => {
    let active = true;
    setOptions({ status: 'loading' });
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      try { const data = await games.getFilters(); if (active) setOptions({ status: 'ready', data }); }
      catch { if (active) setOptions({ status: 'error' }); }
    })();
    return () => { active = false; };
  }, [games, optionsAttempt]);
  useEffect(() => {
    let active: boolean = true;
    games.list(query).then(
      (data) => { if (active) { blocking.current = false; setState({ status: 'ready', data }); } },
      (error: unknown) => { if (active) {
        blocking.current = false;
        setState(previous => ({ status: 'error', data: previous.data, retryBlocking: previous.status === 'loading' && previous.blocking, invalidFilter: error instanceof HttpFailure && error.code === 'invalid_filter', integration: error instanceof HttpFailure && [502, 503, 504].includes(error.status ?? 0) }));
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
    apply({ ...draft, term: draft.term.trim(), page: 1, pageSize: query.pageSize });
  }
  function apply(next: GameQuery): void {
    if (next.term === query.term && next.sort === query.sort && next.genreId === query.genreId && next.platformId === query.platformId && next.page === query.page && next.pageSize === query.pageSize) return;
    if (!startLoading(true)) return;
    setQuery(next);
  }

  function clearSearch(): void {
    if (blocking.current) return;
    if (!draft.term.trim() && !query.term?.trim()) return;
    setDraft(previous => ({ ...previous, term: '' }));
    if (!query.term?.trim()) return;
    if (!startLoading(true)) return;
    setQuery(previous => ({ ...previous, term: '', page: 1 }));
  }
  function clearFilters(): void {
    if (blocking.current) return;
    setDraft(defaults);
    apply({ ...defaults, page: 1, pageSize: query.pageSize });
  }

  function changeSort(value: string): void {
    if (value !== 'release-desc' && value !== 'name-asc' && value !== 'name-desc') return;
    const sort: GameSort = value;
    if (!blocking.current) setDraft(previous => ({ ...previous, sort }));
  }
  function changeDimension(kind: 'genreId' | 'platformId', value: string): void {
    if (blocking.current || options.status !== 'ready') return;
    const entries = kind === 'genreId' ? options.data.genres : options.data.platforms;
    if (value !== '' && !entries.some(option => String(option.id) === value)) return;
    setDraft(previous => ({ ...previous, [kind]: value === '' ? undefined : Number(value) }));
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
    <form className="catalog-search catalog-filters" aria-label="Busca de jogos" onSubmit={search}>
      <TextField label="Buscar jogos" placeholder="Encontre seu próximo jogo…" value={draft.term} onChange={event => setDraft(previous => ({ ...previous, term: event.target.value }))} />
      <div className="sort-field"><label htmlFor="game-genre">Gênero</label>
        <select id="game-genre" value={draft.genreId ?? ''} disabled={options.status !== 'ready'} onChange={event => changeDimension('genreId', event.target.value)}>
          <option value="">Todos</option>{options.status === 'ready' && options.data.genres.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </div>
      <div className="sort-field"><label htmlFor="game-platform">Plataforma</label>
        <select id="game-platform" value={draft.platformId ?? ''} disabled={options.status !== 'ready'} onChange={event => changeDimension('platformId', event.target.value)}>
          <option value="">Todos</option>{options.status === 'ready' && options.data.platforms.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </div>
    <div className="sort-field">
      <label htmlFor="game-sort">Ordenar por</label>{' '}
      <select id="game-sort" value={draft.sort} aria-describedby="game-sort-help" onChange={(event) => changeSort(event.target.value)}>
        <option value="release-desc">Últimos lançados</option>
        <option value="name-asc">Nome: A–Z</option>
        <option value="name-desc">Nome: Z–A</option>
      </select>
      <small id="game-sort-help">Últimos lançados usa a primeira data de lançamento, da mais recente à mais antiga.</small>
    </div>
    <div className="catalog-filter-actions"><Button type="submit">Aplicar filtros</Button><Button onClick={clearSearch}>Limpar busca</Button><Button onClick={clearFilters}>Limpar filtros</Button></div>
    <div className="filter-options-feedback" role="region" aria-label="Opções de filtro" aria-busy={options.status === 'loading'}>
      {options.status === 'loading' && <LoadingState message="Carregando opções de filtro…" />}
      {options.status === 'error' && <><p role="alert">Não foi possível carregar as opções de filtro.</p><Button onClick={() => setOptionsAttempt(previous => previous + 1)}>Tentar novamente opções</Button></>}
    </div>
    </form>
    </div>
    <section aria-labelledby="catalog-title" aria-busy={state.status === 'loading'}>
      <h2 id="catalog-title">Jogos</h2>
      {state.status === 'loading' && !state.blocking && <LoadingState message="Carregando jogos…" />}
      {state.status === 'error' && <ErrorState message={state.invalidFilter ? 'Filtro indisponível. Altere a seleção e aplique novamente.' : state.integration ? 'O catálogo está temporariamente indisponível. Tente novamente.' : 'Não foi possível carregar os jogos.'} onRetry={retry} />}
      {state.status === 'ready' && <CatalogNotice paths={[['games']]} onRetry={retry} />}
      {state.status === 'error' && data && <p>Resultados anteriores; a atualização não foi concluída.</p>}
      {data && <div className="catalog-results" aria-hidden={state.status !== 'ready'} inert={state.status !== 'ready'}>
        <p className="catalog-count" style={{ visibility: state.status === 'ready' ? 'visible' : 'hidden' }}>Exibindo {data.items.length} {data.items.length === 1 ? 'jogo' : 'jogos'} · até {data.pageSize} por página</p>
        {data.items.length
          ? <div className="game-grid">{data.items.map((game) => <GameCard key={game.id} game={game} showReleaseDate />)}</div>
          : <EmptyState message={query.term?.trim() ? 'Nenhum jogo encontrado para esta busca.' : 'Nenhum jogo disponível.'} />}
      </div>}
        <nav className="catalog-pagination catalog-pagination-controls" aria-label="Páginas do catálogo">
          <Button disabled={state.status !== 'ready' || !data || data.page <= 1} onClick={() => { if (!data || !startLoading()) return; setQuery(current => ({ ...current, page: data.page - 1 })); }}>Anterior</Button>
          <span aria-live="polite">Página {data?.page ?? query.page}</span>
          <Button disabled={state.status !== 'ready' || !data?.hasNextPage} onClick={() => { if (!data || !startLoading()) return; setQuery(current => ({ ...current, page: data.page + 1 })); }}>Próxima</Button>
          <div className="sort-field catalog-page-size">
            <label htmlFor="game-page-size">Itens por página</label>
            <select id="game-page-size" value={query.pageSize} onChange={(event) => changePageSize(event.target.value)}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </nav>
    </section>

  </main>;
}
