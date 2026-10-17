import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import type { Game, GameId } from '../models';
import { useLocalRouteId } from '../routing/useLocalRouteId';
import { useServices } from '../services/ServiceProvider';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { GameOpinionsSection } from './GameOpinionsSection';
import { GameCover } from '../components/GameCover';
import { PublishReview } from './PublishReview';
import { GameFavoriteStar } from '../components/GameFavoriteStar';
import { CatalogNotice } from '../components/CatalogNotice';

type GameState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; game: Game | null };
interface GameDetailsContentProps { id: GameId; }

function releaseLabel(value: string | null): string {
  if (!value) return 'Lançamento não informado.';
  const date: Date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Lançamento não informado.'
    : new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(date);
}

function GameDetailsContent({ id }: GameDetailsContentProps): ReactElement {
  const { games } = useServices();
  const [state, setState] = useState<GameState>({ status: 'loading' });
  const [attempt, setAttempt] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [opinionsVersion, setOpinionsVersion] = useState(0);
  useEffect(() => {
    let active: boolean = true;
    setRefreshing(true);
    games.getById(id).then(
      (game) => { if (active) { setState({ status: 'ready', game }); setRefreshing(false); } },
      () => { if (active) { setState({ status: 'error' }); setRefreshing(false); } },
    );
    return () => { active = false; };
  }, [id, attempt]);

  function retry(): void {
    setState({ status: 'loading' });
    setAttempt((previous) => previous + 1);
  }

  if (state.status === 'loading') return <LoadingState region="Informações do jogo" message="Carregando jogo…" />;
  if (state.status === 'error') return <ErrorState region="Informações do jogo" message="Não foi possível carregar o jogo." onRetry={retry} />;
  const game: Game | null = state.game;
  if (!game) return <EmptyState region="Informações do jogo" message="Jogo não encontrado." />;
  return <>
    <CatalogNotice paths={[[ 'games', String(id) ], ['games', String(id), 'opinions'], ['games', String(id), 'reviews']]} onRetry={retry} />
    <section className="game-information" aria-labelledby="game-title">
    <div className="game-facts" role="region" aria-label="Informações do jogo" aria-busy={refreshing}>
    <aside className="game-poster" aria-label="Capa do jogo">
      <GameCover title={game.title} src={game.coverUrl} className="details-cover" />
    </aside>
    <div className="game-overview">
    <header className="game-detail-header">
      <h2 id="game-title">{game.title}</h2>
      <div className="game-header-actions">
        <GameFavoriteStar game={game} />
        <PublishReview gameId={id} onSaved={() => { setAttempt(value => value + 1); setOpinionsVersion(value => value + 1); }} />
      </div>
    </header>
    <p>{game.summary.trim() || 'Descrição indisponível.'}</p>
    <dl>
      <dt>Gêneros</dt><dd>{game.genres.length ? game.genres.join(', ') : 'Gêneros não informados.'}</dd>
      <dt>Plataformas</dt><dd>{game.platforms.length ? game.platforms.join(', ') : 'Plataformas não informadas.'}</dd>
      <dt>Lançamento</dt><dd>{releaseLabel(game.releaseDate)}</dd>
    </dl>
    </div>
    </div>
    <div className="game-discussion">
    <GameOpinionsSection key={`${id}-${opinionsVersion}`} gameId={id} />
    </div>
  </section></>;
}

export function GameDetailsPage(): ReactElement {
  const id: GameId | undefined = useLocalRouteId('gameId');
  return <main className="game-details-page">
    <h1 className="game-page-label">Detalhes do jogo</h1>
    <p className="game-id">ID do jogo: {id}</p>
    {id ? <GameDetailsContent key={id} id={id} /> : <EmptyState region="Informações do jogo" message="Jogo não encontrado." />}
  </main>;
}
