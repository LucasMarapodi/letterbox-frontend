import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { notifications } from '../services/notifications';
import type { NotificationItem } from '../services/notificationContracts';
import { useSession } from '../session/SessionProvider';
import { encodeRouteId } from '../routing/encodeRouteId';
import { Avatar } from './Avatar';
import { EmptyState, ErrorState, LoadingState } from './Feedback';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: NotificationItem[] };
function NotificationModal({ onClose, trigger }: { onClose: () => void; trigger: HTMLButtonElement | null }): ReactElement {
  const { user } = useSession();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    function containFocus(event: FocusEvent): void {
      if (event.target instanceof Node && !dialogRef.current?.contains(event.target)) closeRef.current?.focus();
    }
    function handleKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
      if (!controls?.length) return;
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', handleKey);
    document.addEventListener('focusin', containFocus);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('focusin', containFocus);
      if (trigger?.isConnected) trigger.focus();
    };
  }, [onClose, trigger]);
  useEffect(() => {
    let active = true;
    void notifications.list(user).then((items) => { if (active) setState({ status: 'ready', items }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [user, attempt]);
  return createPortal(<div className="modal-backdrop"><section ref={dialogRef} className="notification-modal" role="dialog" aria-modal="true" aria-labelledby="notifications-title">
    <div className="modal-heading"><h2 id="notifications-title">Notificações</h2><button ref={closeRef} type="button" aria-label="Fechar notificações" onClick={onClose}>×</button></div>
    {state.status === 'loading' && <LoadingState message="Carregando notificações…" />}
    {state.status === 'error' && <ErrorState message="Não foi possível carregar as notificações." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />}
    {state.status === 'ready' && (state.items.length ? <ul className="notification-list">{state.items.map((item) => <li key={item.id}>
      <Link to={`/reviews/${encodeRouteId(item.reviewId)}`} onClick={onClose}><Avatar name={item.actor.displayName} src={item.actor.avatarUrl} /><div><span>{item.actor.displayName} {item.type === 'new-review' ? 'publicou uma nova review' : 'comentou na sua review'}</span><time dateTime={item.createdAt}>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.createdAt))}</time></div></Link>
    </li>)}</ul> : <EmptyState message="Nenhuma notificação." />)}
  </section></div>, document.body);
}
function SessionBell(): ReactElement {
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  return <><button ref={bellRef} className="notification-bell" type="button" aria-label="Notificações" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></svg>
  </button>{open && <NotificationModal onClose={close} trigger={bellRef.current} />}</>;
}
export function NotificationBell(): ReactElement | null {
  const { user } = useSession();
  return user ? <SessionBell key={user.id} /> : null;
}
