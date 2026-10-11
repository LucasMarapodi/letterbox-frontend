import { useEffect, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { notifications } from '../services/notifications';
import type { NotificationItem } from '../services/notificationContracts';
import { useSession } from '../session/SessionProvider';
import { encodeRouteId } from '../routing/encodeRouteId';
import { Avatar } from './Avatar';
import { EmptyState, ErrorState, LoadingState } from './Feedback';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: NotificationItem[] };
function NotificationModal({ onClose }: { onClose: () => void }): ReactElement {
  const { user } = useSession();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void notifications.list(user).then((items) => { if (active) setState({ status: 'ready', items }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [user, attempt]);
  return createPortal(<div className="modal-backdrop"><section className="notification-modal" role="dialog" aria-modal="true" aria-labelledby="notifications-title">
    <div className="modal-heading"><h2 id="notifications-title">Notificações</h2><button type="button" aria-label="Fechar notificações" onClick={onClose}>×</button></div>
    {state.status === 'loading' && <LoadingState message="Carregando notificações…" />}
    {state.status === 'error' && <ErrorState message="Não foi possível carregar as notificações." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />}
    {state.status === 'ready' && (state.items.length ? <ul className="notification-list">{state.items.map((item) => <li key={item.id}>
      <Link to={`/reviews/${encodeRouteId(item.reviewId)}`} onClick={onClose}><Avatar name={item.actor.displayName} src={item.actor.avatarUrl} /><div><span>{item.actor.displayName} {item.type === 'new-review' ? 'publicou uma nova review' : 'comentou na sua review'}</span><time dateTime={item.createdAt}>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.createdAt))}</time></div></Link>
    </li>)}</ul> : <EmptyState message="Nenhuma notificação." />)}
  </section></div>, document.body);
}
export function NotificationBell(): ReactElement {
  const [open, setOpen] = useState(false);
  return <><button className="notification-bell" type="button" aria-label="Notificações" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></svg>
  </button>{open && <NotificationModal onClose={() => setOpen(false)} />}</>;
}
