import { CatalogNotice } from '../components/CatalogNotice';
import { useEffect, useState, type ReactElement } from 'react';
import { useServices } from '../services/ServiceProvider';
import type { RankedGame, RankingPeriod } from '../services/communityContracts';
import { GameCard } from '../components/GameCard';
import { LoadingState, ErrorState, EmptyState } from '../components/Feedback';
type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: RankedGame[] };
export function CommunityRankedGames({ period }: { period: RankingPeriod }): ReactElement {
  const { community } = useServices();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void community.getGamesInDiscussion(period).then((items) => { if (active) setState({ status: 'ready', items }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [community, period, attempt]);
  return <section aria-label="Jogos em discussão"><h2>Jogos em discussão</h2>
    {state.status === 'ready' && <CatalogNotice paths={[['community', 'games', 'in-discussion']]} onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />}
    {state.status === 'loading' && <LoadingState message="Carregando jogos em discussão…" />}
    {state.status === 'error' && <ErrorState message="Não foi possível carregar os jogos em discussão." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />}
    {state.status === 'ready' && (state.items.length ? <div className="game-grid">{state.items.map((item) => <GameCard key={item.game.id} game={item.game} commentCount={item.commentCount} lastCommentAt={item.lastCommentAt} />)}</div> : <EmptyState message="Nenhum jogo com comentários neste período." />)}
  </section>;
}
