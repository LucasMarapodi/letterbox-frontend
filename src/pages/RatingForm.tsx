import { useRef, useState, type ReactElement, type FormEvent } from 'react';
import { useSession } from '../session/SessionProvider';
import { RequireSession } from '../session/RequireSession';
import { community } from '../services/community';
import { Button } from '../components/Button';

interface RatingFormProps { gameId: string; onSaved?: () => void; }
function RatingControl({ gameId, onSaved }: RatingFormProps): ReactElement {
  const { user } = useSession();
  const [value, setValue] = useState<string>('0');
  const [message, setMessage] = useState<string>('');
  const [failed, setFailed] = useState<boolean>(false);
  const [pending, setPending] = useState<boolean>(false);
  const sending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user || sending.current) return;
    sending.current = true; setPending(true); setMessage(''); setFailed(false);
    try { const rating = await community.rate(gameId, Number(value), user); setMessage(`Nota ${rating.value} salva.`); onSaved?.(); }
    catch { setFailed(true); setMessage('Não foi possível salvar a nota. Tente novamente.'); }
    finally { sending.current = false; setPending(false); }
  }
  return <form onSubmit={submit} aria-label="Avaliar jogo" className="review-card">
    <label htmlFor="rating-value">Sua nota</label>{' '}
    <select id="rating-value" value={value} disabled={pending} onChange={(event) => setValue(event.target.value)}>{[0, 1, 2, 3, 4, 5].map((note) => <option key={note} value={note}>{note}</option>)}</select>{' '}
    <Button type="submit" disabled={pending}>{pending ? 'Salvando…' : 'Salvar nota'}</Button>
    {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
  </form>;
}
export function RatingForm(props: RatingFormProps): ReactElement {
  const { user } = useSession();
  return <section aria-label="Sua avaliação"><RequireSession><RatingControl key={user?.id} {...props} /></RequireSession></section>;
}
