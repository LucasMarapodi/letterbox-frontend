import type { FormEvent, ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Game } from '../models';
import { services } from '../services';
import { GameCard } from '../components/GameCard';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import type { GameQuery, GameSort } from '../services/contracts';

type CatalogState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; games: Game[] };

export function HomePage(): ReactElement {
  const [state, setState] = useState<CatalogState>({ status: 'loading' });
  const [attempt, setAttempt] = useState<number>(0);
  const [term, setTerm] = useState<string>('');
  const [query, setQuery] = useState<GameQuery>({ term: '', sort: 'name-asc' });
  useEffect(() => {
    let active: boolean = true;
    services.games.list(query).then(
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
  return <main>
    <h1>Game Reviews</h1>
    <p>Explore jogos e descubra novas experiências.</p>
    <form aria-label="Busca de jogos" onSubmit={search}>
      <TextField label="Buscar jogos" value={term} onChange={(event) => setTerm(event.target.value)} />
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
    <nav aria-label="Rotas de exemplo">
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
  </main>;
}
