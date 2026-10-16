import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useServices } from '../services/ServiceProvider';
import type { CommentPageSize, RankedComment, RankedCommentPage, RankingPeriod, PublicComment } from '../services/communityContracts';
import { encodeRouteId } from '../routing/encodeRouteId';
import { Button } from '../components/Button';
import { CommentLikeButton } from '../components/CommentLikeButton';
import { ReviewAuthor } from '../components/ReviewAuthor';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: RankedCommentPage };
const dateFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' });

function RankedCommentCard({ item, onChanged }: { item: RankedComment; onChanged: () => void }) {
  const comment: PublicComment = {
    id: item.commentId, reviewId: item.reviewId, userId: item.author.id, parentCommentId: item.parentCommentId,
    text: item.text, createdAt: item.createdAt, author: item.author, likeCount: item.likeCount,
  };
  return <article className="review-card review-preview ranked-comment">
    <Link className="review-card-link" to={`/reviews/${encodeRouteId(item.reviewId)}#comentario-${item.commentId}`} aria-label={`Abrir review do comentário de ${item.author.displayName}`} />
    <ReviewAuthor author={item.author} />
    <p className="comment-context"><span>{item.parentCommentId === null ? 'Comentário em uma review' : 'Resposta em uma review'}</span> · <Link to={`/jogos/${encodeRouteId(item.gameId)}`}>Ver jogo</Link></p>
    <time className="ranked-comment-date" dateTime={item.createdAt}>{dateFormat.format(new Date(item.createdAt))} (UTC)</time>
    <p className="review-text">{item.text}</p>
    <p className="comment-rank-count">{item.periodLikeCount} {item.periodLikeCount === 1 ? 'curtida' : 'curtidas'} no período</p>
    <CommentLikeButton comment={comment} onChanged={onChanged} countSuffix=" no total" />
    <p className="ranked-comment-date">Última curtida no período: <time dateTime={item.lastLikeAt}>{dateFormat.format(new Date(item.lastLikeAt))} (UTC)</time></p>
  </article>;
}

export function CommunityRankedComments({ period, pageSize, onPageSizeChange }: { period: RankingPeriod; pageSize: CommentPageSize; onPageSizeChange: (size: CommentPageSize) => void }) {
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
        const data = await http().community.mostLikedComments({ period, page, pageSize }, controller.signal);
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
  return <section aria-label="Comentários mais curtidos" aria-busy={state.status === 'loading'}>
    <h2>Comentários mais curtidos</h2>
    <p>Ordenados pelas curtidas ativas recebidas no período, incluindo comentários antigos e respostas.</p>
    {state.status === 'loading' && <LoadingState message="Carregando comentários mais curtidos…" />}
    {state.status === 'error' && <ErrorState message="Não foi possível carregar os comentários mais curtidos." onRetry={refresh} />}
    {state.status === 'ready' && <>
      <p className="catalog-count">Exibindo {state.data.items.length} {state.data.items.length === 1 ? 'comentário' : 'comentários'} · até {state.data.pageSize} por página</p>
      {state.data.items.length ? state.data.items.map(item => <RankedCommentCard key={item.commentId} item={item} onChanged={refresh} />) : <EmptyState message="Nenhum comentário curtido neste período." />}
    </>}
    <nav className="catalog-pagination catalog-pagination-controls" aria-label="Páginas dos comentários mais curtidos">
      <Button disabled={state.status !== 'ready' || page <= 1} onClick={() => movePage(page - 1)}>Anterior</Button>
      <span aria-live="polite">Página {page}</span>
      <Button disabled={state.status !== 'ready' || !state.data.hasNextPage} onClick={() => movePage(page + 1)}>Próxima</Button>
      <div className="sort-field catalog-page-size"><label htmlFor="comment-page-size">Comentários por página</label><select id="comment-page-size" value={pageSize} onChange={event => resize(event.target.value)}><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></div>
    </nav>
  </section>;
}
