import { CatalogNotice } from '../components/CatalogNotice';
import { useEffect, useState, type ReactElement } from 'react';
import { useServices } from '../services/ServiceProvider';
import type { RankedReview, RankingPeriod } from '../services/communityContracts';
import { CommunityReviewCard } from '../components/CommunityReviewCard';
import { LoadingState, ErrorState, EmptyState } from '../components/Feedback';
type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: RankedReview[] };
export function CommunityRankedReviews({ period }: { period: RankingPeriod }): ReactElement {
  const { community } = useServices();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    void community.getMostCommented(period).then((items) => { if (active) setState({ status: 'ready', items }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [community, period, attempt]);
  return <section aria-label="Reviews mais comentadas" aria-busy={state.status === 'loading'}><h2>Reviews mais comentadas</h2>
    {state.status === 'ready' && <CatalogNotice paths={[['community', 'reviews', 'most-commented']]} onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />}
    {state.status === 'loading' && <LoadingState message="Carregando reviews mais comentadas…" />}
    {state.status === 'error' && <ErrorState message="Não foi possível carregar as reviews mais comentadas." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />}
    {state.status === 'ready' && (state.items.length ? state.items.map((item) => <CommunityReviewCard key={item.review.id} review={item.review} commentCount={item.commentCount} lastCommentAt={item.lastCommentAt} />) : <EmptyState message="Nenhuma review com comentários neste período." />)}
  </section>;
}
