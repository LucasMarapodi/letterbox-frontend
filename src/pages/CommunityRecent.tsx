import { useEffect, useState, type ReactElement } from 'react';
import { useServices } from '../services/ServiceProvider';
import type { ReviewDetails } from '../services/communityContracts';
import { CommunityReviewCard } from '../components/CommunityReviewCard';
import { LoadingState, ErrorState, EmptyState } from '../components/Feedback';
type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; reviews: ReviewDetails[] };
export function CommunityRecent(): ReactElement {
  const { community } = useServices();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void community.getRecentReviews().then((reviews) => { if (active) setState({ status: 'ready', reviews }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [community, attempt]);
  return <section aria-label="Reviews recentes"><h2>Reviews recentes</h2>
    {state.status === 'loading' && <LoadingState message="Carregando reviews recentes…" />}
    {state.status === 'error' && <ErrorState message="Não foi possível carregar as reviews recentes." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />}
    {state.status === 'ready' && (state.reviews.length ? state.reviews.map((review) => <CommunityReviewCard key={review.id} review={review} />) : <EmptyState message="Nenhuma review publicada." />)}
  </section>;
}
