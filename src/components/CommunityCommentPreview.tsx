import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PublicComment } from '../services/communityContracts';
import { useServices } from '../services/ServiceProvider';
import { encodeRouteId } from '../routing/encodeRouteId';
import { Avatar } from './Avatar';
import { ErrorState, LoadingState } from './Feedback';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; comments: PublicComment[] };
export function CommunityCommentPreview({ reviewId }: { reviewId: number }) {
  const { community } = useServices();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    void community.getComments(reviewId).then(comments => { if (active) setState({ status: 'ready', comments }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [community, reviewId, attempt]);
  if (state.status === 'ready' && !state.comments.length) return null;
  return <section className="community-comment-preview" aria-label="Prévia dos comentários" aria-busy={state.status === 'loading'}>
    <h4>Comentários</h4>
    {state.status === 'loading' && <LoadingState message="Carregando comentários…" />}
    {state.status === 'error' && <ErrorState message="Não foi possível carregar os comentários." onRetry={() => setAttempt(value => value + 1)} />}
    {state.status === 'ready' && <>
      <ul className="comment-preview-list">{state.comments.slice(0, 2).map(comment => <li key={comment.id}>
        <div className="comment-preview-author"><Avatar name={comment.author.displayName} src={comment.author.avatarUrl} /><Link to={`/perfil/${encodeRouteId(comment.author.id)}`}>{comment.author.displayName}</Link></div>
        <p className="comment-preview-text">{comment.text}</p>
      </li>)}</ul>
      {state.comments.length > 2 && <Link className="comment-preview-more" to={`/reviews/${encodeRouteId(reviewId)}#comentario-${state.comments[2].id}`}>Ver mais</Link>}
    </>}
  </section>;
}
