import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useServices } from '../services/ServiceProvider';
import type { ForumPage, ForumTopic } from '../services/forumContracts';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { ForumByline, ForumPagination } from '../components/ForumPresentation';

export function ForumTopics({ gameId, page, onPage }: { gameId: number; page: number; onPage(page: number): void }) {
  const { http } = useServices();
  const [state, setState] = useState<{ status: 'loading' | 'error' } | { status: 'ready'; data: ForumPage<ForumTopic> }>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    void (async () => {
      try {
        if (!http) throw new Error('HTTP indisponível');
        const data = await http().forum.topics(gameId, page, controller.signal);
        if (!controller.signal.aborted) setState({ status: 'ready', data });
      } catch { if (!controller.signal.aborted) setState({ status: 'error' }); }
    })();
    return () => controller.abort();
  }, [gameId, page, http, attempt]);
  return <section className="forum-topics" aria-label="Tópicos do jogo" aria-busy={state.status === 'loading'}>
    <h2>Fórum</h2>
    {state.status === 'loading' && <LoadingState message="Carregando tópicos…" />}
    {state.status === 'error' && <ErrorState message="Não foi possível carregar os tópicos." onRetry={() => setAttempt(value => value + 1)} />}
    {state.status === 'ready' && (state.data.items.length ? state.data.items.map(topic => <article className="forum-card" key={topic.id}>
      <h3><Link to={`/jogos/${gameId}/forum/${topic.id}`}>{topic.title}</Link></h3>
      <ForumByline author={topic.author} date={topic.createdAt} />
      <p>{topic.replyCount} {topic.replyCount === 1 ? 'resposta' : 'respostas'}</p>
      <p className="forum-activity">Última atividade: <time dateTime={topic.lastActivityAt}>{new Date(topic.lastActivityAt).toLocaleString('pt-BR')}</time></p>
    </article>) : <EmptyState message="Nenhum tópico neste jogo." />)}
    <ForumPagination label="Páginas dos tópicos" page={page} hasNext={state.status === 'ready' && state.data.hasNextPage} busy={state.status !== 'ready'} onPage={onPage} />
  </section>;
}
