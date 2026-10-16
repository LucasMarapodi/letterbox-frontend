import type { FormEvent, ReactElement, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Game } from '../models';
import { useServices } from '../services/ServiceProvider';
import { GameCard } from '../components/GameCard';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import type { GameQuery, GameSort } from '../services/contracts';

type CatalogState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; games: Game[] };

export function HomePage({ authenticated = false, favorites, feed }: { authenticated?: boolean; favorites?: ReactNode; feed?: ReactNode }): ReactElement {
  const { games } = useServices();
  const [state, setState] = useState<CatalogState>({ status: 'loading' });
  const [attempt, setAttempt] = useState<number>(0);
  const [term, setTerm] = useState<string>('');
  const [query, setQuery] = useState<GameQuery>({ term: '', sort: 'name-asc' });
  useEffect(() => {
    let active: boolean = true;
    games.list(query).then(
      (games) => { if (active) setState({ status: 'ready', games }); },
      () => { if (active) setState({ status: 'error' }); },
    );
    return () => { active = false; };
  }, [attempt, query]);

  function search(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setState({ status: 'loading' });
    setQuery((previous) => ({ ...previous, term }));
  }

  function clearSearch(): void {
    setTerm('');
    setState({ status: 'loading' });
    setQuery((previous) => ({ ...previous, term: '' }));
  }

  function changeSort(value: string): void {
    if (value !== 'name-asc' && value !== 'name-desc') return;
    const sort: GameSort = value;
    setState({ status: 'loading' });
    setQuery((previous) => ({ ...previous, sort }));
  }

  function retry(): void {
    setState({ status: 'loading' });
    setAttempt((previous) => previous + 1);
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
        <option value="name-asc">Nome: A–Z</option>
        <option value="name-desc">Nome: Z–A</option>
      </select>
    </div>
    </div>
    <nav className="example-links" aria-label="Rotas de exemplo">
      <Link to="/jogos/game-1">Jogo de exemplo</Link>{' '}
      <Link to="/reviews/review-1">Review de exemplo</Link>{' '}
      <Link to="/perfil/user-1">Perfil de exemplo</Link>
    </nav>
    <section aria-labelledby="catalog-title">
      <h2 id="catalog-title">Jogos</h2>
      {state.status === 'loading' && <LoadingState message="Carregando jogos…" />}
      {state.status === 'error' && <ErrorState message="Não foi possível carregar os jogos." onRetry={retry} />}
      {state.status === 'ready' && (state.games.length
        ? <div className="game-grid">{state.games.map((game) => <GameCard key={game.id} game={game} />)}</div>
        : <EmptyState message={query.term?.trim() ? 'Nenhum jogo encontrado para esta busca.' : 'Nenhum jogo disponível.'} />)}
    </section>
    {favorites}
    {feed}
  </main>;
}

