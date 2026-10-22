import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { isLocalId } from '../models';
import { forumPageNumber, type ForumTopicDetail, type ForumPage, type ForumReply } from '../services/forumContracts';
import { useServices } from '../services/ServiceProvider';
import { useSession } from '../session/SessionProvider';
import { HttpFailure } from '../services/http/client';
import { ForumByline, ForumPagination } from '../components/ForumPresentation';
import { ForumForm } from '../components/ForumForm';
import { GameCover } from '../components/GameCover';
import { LoadingState, ErrorState, EmptyState } from '../components/Feedback';

type ReplyState = { status: 'loading' | 'error' } | { status: 'ready'; data: ForumPage<ForumReply> };
function Discussion({ gameId, topicId }: { gameId: number; topicId: number }) {
  const { http } = useServices(), { user, version } = useSession();
  const [query, setQuery] = useSearchParams(), page = forumPageNumber(query.get('page'));
  const [topic, setTopic] = useState<ForumTopicDetail | null>(null), [status, setStatus] = useState<'loading' | 'error' | 'missing' | 'ready'>('loading');
  const [attempt, setAttempt] = useState(0), [replyAttempt, setReplyAttempt] = useState(0), [replies, setReplies] = useState<ReplyState>({ status: 'loading' });
  const [published, setPublished] = useState<ForumReply | null>(null), [syncError, setSyncError] = useState(false);
  const lifetime = useRef<AbortController | null>(null);
  useEffect(() => { const controller = new AbortController(); lifetime.current = controller; return () => controller.abort(); }, []);
  useEffect(() => {
    const request = new AbortController(); setStatus('loading');
    void (async () => {
      try {
        if (!http) throw new Error('HTTP indisponível');
        const data = await http().forum.topic(topicId, request.signal);
        if (!request.signal.aborted) { if (data.gameId !== gameId) setStatus('missing'); else { setTopic(data); setStatus('ready'); } }
      } catch (error: unknown) { if (!request.signal.aborted) setStatus(error instanceof HttpFailure && error.status === 404 ? 'missing' : 'error'); }
    })();
    return () => request.abort();
  }, [gameId, topicId, http, attempt]);
  useEffect(() => {
    if (status !== 'ready') return;
    const request = new AbortController(); setReplies({ status: 'loading' });
    void (async () => {
      try {
        if (!http) throw new Error('HTTP indisponível');
        const data = await http().forum.replies(topicId, page, request.signal);
        if (!request.signal.aborted) setReplies({ status: 'ready', data });
      } catch { if (!request.signal.aborted) setReplies({ status: 'error' }); }
    })();
    return () => request.abort();
  }, [http, topicId, status, page, replyAttempt]);
  async function locateReply(reply: ForumReply) {
    const signal = lifetime.current?.signal;
    if (!http || signal?.aborted) return;
    setSyncError(false);
    try {
      const data = await http().forum.topic(topicId, signal);
      if (data.gameId !== gameId) throw new Error('Contexto divergente');
      let destination = Math.max(1, Math.ceil(data.replyCount / 20));
      let collection = await http().forum.replies(topicId, destination, signal);
      // Publicações concorrentes podem ter avançado a última página após nosso POST.
      while (!collection.items.some(item => item.id === reply.id) && destination > 1) collection = await http().forum.replies(topicId, --destination, signal);
      if (!collection.items.some(item => item.id === reply.id)) throw new Error('Resposta ainda não localizada');
      if (signal?.aborted) return;
      setTopic(data); setPublished(null); setQuery(destination === 1 ? {} : { page: String(destination) });
      setReplies({ status: 'ready', data: collection });
    } catch { if (!signal?.aborted) { setPublished(reply); setSyncError(true); } }
  }
  return <>
    <Link to={`/jogos/${gameId}?aba=forum&page=1`}>Voltar ao Fórum</Link>
    {status === 'loading' && <LoadingState message="Carregando tópico…" />}
    {status === 'missing' && <EmptyState message="Tópico não encontrado neste jogo." />}
    {status === 'error' && <ErrorState message="Não foi possível carregar o tópico." onRetry={() => setAttempt(value => value + 1)} />}
    {status === 'ready' && topic && <>
      <div className="forum-game-context"><GameCover title={topic.game.title} src={topic.game.coverUrl} /><Link to={`/jogos/${gameId}`}>{topic.game.title}</Link></div>
      <article className="forum-card"><h1>{topic.title}</h1><ForumByline author={topic.author} date={topic.createdAt} /><p className="forum-message">{topic.text}</p><p>{topic.replyCount} {topic.replyCount === 1 ? 'resposta' : 'respostas'}</p><p className="forum-activity">Última atividade: <time dateTime={topic.lastActivityAt}>{new Date(topic.lastActivityAt).toLocaleString('pt-BR')}</time></p></article>
      <section aria-label="Respostas do tópico" aria-busy={replies.status === 'loading'}><h2>Respostas</h2>
        {replies.status === 'loading' && <LoadingState message="Carregando respostas…" />}
        {replies.status === 'error' && <ErrorState message="Não foi possível carregar as respostas." onRetry={() => setReplyAttempt(value => value + 1)} />}
        {replies.status === 'ready' && (replies.data.items.length ? replies.data.items.map(reply => <article className="forum-card" key={reply.id} id={`resposta-${reply.id}`}><ForumByline author={reply.author} date={reply.createdAt} /><p className="forum-message">{reply.text}</p></article>) : <EmptyState message="Nenhuma resposta neste tópico." />)}
        <ForumPagination label="Páginas das respostas" page={page} hasNext={replies.status === 'ready' && replies.data.hasNextPage} busy={replies.status !== 'ready'} onPage={next => setQuery(next === 1 ? {} : { page: String(next) })} />
      </section>
      {syncError && published && <ErrorState message="Resposta publicada, mas não foi possível atualizar a discussão." onRetry={() => { void locateReply(published); }} />}
      {user ? <ReplyForm key={`${version}-${user.id}`} topicId={topicId} onSaved={locateReply} /> : <Link to="/login">Entrar para responder</Link>}
    </>}
  </>;
}
function ReplyForm({ topicId, onSaved }: { topicId: number; onSaved(reply: ForumReply): Promise<void> }) {
  const { http } = useServices(), sending = useRef(false);
  return <ForumForm sending={sending} onSubmit={async (input, signal) => {
    if (!http) throw new Error('HTTP indisponível');
    const reply = await http().forum.reply(topicId, { text: input.text }, signal);
    if (!signal.aborted) await onSaved(reply);
  }} />;
}
export function ForumTopicPage() {
  const params = useParams<'gameId' | 'topicId'>();
  const parse = (value: string | undefined) => value && /^[1-9]\d*$/.test(value) && isLocalId(Number(value)) ? Number(value) : undefined;
  const gameId = parse(params.gameId), topicId = parse(params.topicId);
  return <main className="forum-topic-page">{gameId && topicId ? <Discussion key={`${gameId}-${topicId}`} gameId={gameId} topicId={topicId} /> : <EmptyState message="Tópico não encontrado neste jogo." />}</main>;
}
