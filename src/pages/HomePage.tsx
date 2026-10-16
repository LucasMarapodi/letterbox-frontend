import type { FormEvent, ReactElement, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useServices } from '../services/ServiceProvider';
import { GameCard } from '../components/GameCard';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { CatalogNotice } from '../components/CatalogNotice';
import { HttpFailure } from '../services/http/client';
import type { GamePage, GameQuery, GameSort } from '../services/contracts';

type CatalogState = { status: 'loading' } | { status: 'error'; integration: boolean } | { status: 'ready'; data: GamePage };

export function HomePage({ authenticated = false, feed }: { authenticated?: boolean; feed?: ReactNode }): ReactElement {
  const { games } = useServices();
  const [state, setState] = useState<CatalogState>({ status: 'loading' });
  const [attempt, setAttempt] = useState<number>(0);
  const [term, setTerm] = useState<string>('');
  const explicitSort = useRef(false);
  const [query, setQuery] = useState<GameQuery>({ term: '', sort: 'release-desc', page: 1, pageSize: 20 });
  useEffect(() => {
    let active: boolean = true;
    setState({ status: 'loading' });
    games.list(query).then(
      (data) => { if (active) setState({ status: 'ready', data }); },
      (error: unknown) => { if (active) setState({ status: 'error', integration: error instanceof HttpFailure && [502, 503, 504].includes(error.status ?? 0) }); },
    );
    return () => { active = false; };
  }, [attempt, query]);

  function search(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setState({ status: 'loading' });
    setQuery((previous) => ({ ...previous, term, page: 1, sort: explicitSort.current ? previous.sort : term.trim() ? 'name-asc' : 'release-desc' }));
  }

  function clearSearch(): void {
    if (!term.trim() && !query.term?.trim()) return;
    setTerm('');
    if (!query.term?.trim()) return;
    setState({ status: 'loading' });
    setQuery((previous) => ({ ...previous, term: '', sort: explicitSort.current ? previous.sort : 'release-desc', page: 1 }));
  }

  function changeSort(value: string): void {
    if (value !== 'release-desc' && value !== 'name-asc' && value !== 'name-desc') return;
    const sort: GameSort = value;
    explicitSort.current = true;
    setState({ status: 'loading' });
    setQuery((previous) => ({ ...previous, sort, page: 1 }));
  }

  function retry(): void {
    setState({ status: 'loading' });
    setAttempt((previous) => previous + 1);
  }
  function changePageSize(value: string): void {
    if (value !== '10' && value !== '20' && value !== '50') return;
    const pageSize = Number(value);
    if (pageSize === query.pageSize) return;
    setState({ status: 'loading' });
    setQuery((previous) => ({ ...previous, pageSize, page: 1 }));
  }
  return <main className="dashboard">
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
      {state.status === 'loading' && <LoadingState message="Carregando jogos…" />}
      {state.status === 'error' && <ErrorState message={state.integration ? 'O catálogo está temporariamente indisponível. Tente novamente.' : 'Não foi possível carregar os jogos.'} onRetry={retry} />}
      {state.status === 'ready' && <CatalogNotice paths={[['games']]} onRetry={retry} />}
      {state.status === 'ready' && <p className="catalog-count">Exibindo {state.data.items.length} {state.data.items.length === 1 ? 'jogo' : 'jogos'} · até {state.data.pageSize} por página</p>}
      {state.status === 'ready' && (state.data.items.length
        ? <div className="game-grid">{state.data.items.map((game) => <GameCard key={game.id} game={game} />)}</div>
        : <EmptyState message={query.term?.trim() ? 'Nenhum jogo encontrado para esta busca.' : 'Nenhum jogo disponível.'} />)}
      {state.status === 'ready' && <nav className="catalog-pagination" aria-label="Páginas do catálogo">
        <Button disabled={state.data.page <= 1} onClick={() => { setState({ status: 'loading' }); setQuery((current) => ({ ...current, page: state.data.page - 1 })); }}>Anterior</Button>
        <span aria-live="polite">Página {state.data.page}</span>
        <Button disabled={!state.data.hasNextPage} onClick={() => { setState({ status: 'loading' }); setQuery((current) => ({ ...current, page: state.data.page + 1 })); }}>Próxima</Button>
      </nav>}
    </section>
    {feed}
  </main>;
}
