import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicComment } from '../services/communityContracts';
import type { HttpAdapters } from '../services/http/adapters';
import { HttpFailure } from '../services/http/client';
import { useServices } from '../services/ServiceProvider';
import { useSession } from '../session/SessionProvider';
import { Button } from './Button';
import { ThumbUpIcon } from './ThumbUpIcon';

type State = {
  count: number;
  likedByMe: boolean | null;
  status: 'loading' | 'ready' | 'error';
  pending: boolean;
  message?: string;
};

function PersonalLike({ comment, http }: { comment: PublicComment; http: () => HttpAdapters }) {
  const reply = comment.parentCommentId !== null;
  const target = `${reply ? 'resposta' : 'comentário'} de ${comment.author.displayName}`;
  const subject = `${reply ? 'da' : 'do'} ${target}`;
  const [state, setState] = useState<State>({ count: comment.likeCount, likedByMe: null, status: 'loading', pending: false });
  const busy = useRef(true);
  const controller = useRef<AbortController | null>(null);

  const read = useCallback(async (refreshCount: boolean, signal: AbortSignal): Promise<State> => {
    const api = http();
    const [status, comments] = await Promise.all([
      api.comments.likeStatus(comment.id, signal),
      refreshCount ? api.reviews.comments(comment.reviewId, signal) : Promise.resolve(null),
    ]);
    const confirmed = comments?.find(item => item.id === comment.id);
    if (comments && !confirmed) throw new HttpFailure('http', 404, 'not_found');
    return { count: confirmed?.likeCount ?? comment.likeCount, likedByMe: status.likedByMe, status: 'ready', pending: false };
  }, [http, comment.id, comment.reviewId, comment.likeCount]);

  useEffect(() => {
    const request = new AbortController();
    controller.current = request;
    busy.current = true;
    setState({ count: comment.likeCount, likedByMe: null, status: 'loading', pending: false });
    void read(false, request.signal).then(
      value => { if (!request.signal.aborted) setState(value); },
      () => { if (!request.signal.aborted) setState(previous => ({ ...previous, status: 'error', message: 'Não foi possível consultar sua curtida. Consulte novamente.' })); },
    ).finally(() => { if (!request.signal.aborted) busy.current = false; });
    return () => request.abort();
  }, [read, comment.likeCount]);

  async function run(write: boolean) {
    const signal = controller.current?.signal;
    if (!signal || signal.aborted || busy.current || (write && (state.status !== 'ready' || state.likedByMe === null))) return;
    busy.current = true;
    setState(previous => ({ ...previous, pending: true, message: undefined }));
    try {
      if (write) await http().comments.setLiked(comment.id, !state.likedByMe, signal);
      const confirmed = await read(true, signal);
      if (!signal.aborted) setState(confirmed);
    } catch (error: unknown) {
      if (!signal.aborted) setState(previous => ({
        ...previous, status: 'error', pending: false,
        message: error instanceof HttpFailure && error.status === 404
          ? 'Comentário não está mais disponível. Consulte novamente.'
          : 'Não foi possível confirmar sua curtida. Última contagem preservada; consulte novamente.',
      }));
    } finally {
      if (!signal.aborted) busy.current = false;
    }
  }

  return <span className="review-like-action comment-like-action">
    <span aria-live="polite" aria-atomic="true">{state.count} {state.count === 1 ? 'curtida' : 'curtidas'}</span>
    {state.status === 'error' ? <>
      <Button disabled={state.pending} aria-busy={state.pending} aria-label={`Consultar novamente curtida ${subject}`} onClick={() => { void run(false); }}>Consultar novamente</Button>
      <span role="status">{state.message}</span>
    </> : <Button
      disabled={state.status !== 'ready' || state.pending}
      aria-busy={state.status !== 'ready' || state.pending}
      aria-pressed={state.status === 'ready' ? state.likedByMe ?? undefined : undefined}
      aria-label={state.status !== 'ready' ? `Carregando curtida ${subject}` : state.likedByMe ? `Retirar curtida ${subject}` : `Curtir ${target}`}
      onClick={() => { void run(true); }}
    ><ThumbUpIcon /></Button>}
  </span>;
}

export function CommentLikeButton({ comment }: { comment: PublicComment }) {
  const { user, version } = useSession();
  const { http } = useServices();
  if (!user || !http) return <span className="review-like-action comment-like-action">{comment.likeCount} {comment.likeCount === 1 ? 'curtida' : 'curtidas'}</span>;
  return <PersonalLike key={`${version}-${user.id}-${comment.id}`} comment={comment} http={http} />;
}
