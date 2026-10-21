import { useEffect, useState } from 'react';
import { useServices } from '../services/ServiceProvider';
import type { CommentPageSize, LikedReviewPage, RankingPeriod } from '../services/communityContracts';
import { Button } from '../components/Button';
import { CommunityReviewCard } from '../components/CommunityReviewCard';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: LikedReviewPage };
export function CommunityLikedReviews({ period, pageSize, onPageSizeChange }: { period: RankingPeriod; pageSize: CommentPageSize; onPageSizeChange: (size: CommentPageSize) => void }) {
  const { http } = useServices();
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    async function load() {
      try {
        if (!http) throw new Error('Adaptador HTTP indisponível.');
        const data = await http().community.mostLikedReviews({ period, page, pageSize }, controller.signal);
        if (!controller.signal.aborted) setState({ status: 'ready', data });
      } catch {
        if (!controller.signal.aborted) setState({ status: 'error' });
      }
    }
    void load();
    return () => controller.abort();
  }, [http, period, page, pageSize, attempt]);

  function refresh() { setState({ status: 'loading' }); setAttempt(value => value + 1); }
  function movePage(next: number) { setState({ status: 'loading' }); setPage(next); }
  function resize(value: string) {
    const size = Number(value);
    if (size !== 10 && size !== 20 && size !== 50) return;
    setState({ status: 'loading' }); setPage(1); onPageSizeChange(size);
  }
  return <section aria-label="Reviews mais curtidas" aria-busy={state.status === 'loading'}>
    <h2>Reviews mais curtidas</h2>
    <p>Ordenadas pelas curtidas ativas recebidas no período, incluindo reviews antigas.</p>
    {state.status === 'loading' && <LoadingState message="Carregando reviews mais curtidas…" />}
    {state.status === 'error' && <ErrorState message="Não foi possível carregar as reviews mais curtidas." onRetry={refresh} />}
    {state.status === 'ready' && <>
      <p className="catalog-count">Exibindo {state.data.items.length} {state.data.items.length === 1 ? 'review' : 'reviews'} · até {state.data.pageSize} por página</p>
      {state.data.items.length ? state.data.items.map(item => <CommunityReviewCard key={item.review.id} review={item.review} periodLikeCount={item.periodLikeCount} lastLikeAt={item.lastLikeAt} />) : <EmptyState message="Nenhuma review curtida neste período." />}
    </>}
    <nav className="catalog-pagination catalog-pagination-controls" aria-label="Páginas das reviews mais curtidas">
      <Button disabled={state.status !== 'ready' || page <= 1} onClick={() => movePage(page - 1)}>Anterior</Button>
      <span aria-live="polite">Página {page}</span>
      <Button disabled={state.status !== 'ready' || !state.data.hasNextPage} onClick={() => movePage(page + 1)}>Próxima</Button>
      <div className="sort-field catalog-page-size"><label htmlFor="liked-review-page-size">Reviews por página</label><select id="liked-review-page-size" value={pageSize} onChange={event => resize(event.target.value)}><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></div>
    </nav>
  </section>;
}
