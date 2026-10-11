import { useId, useRef, useState, type ReactElement, type FormEvent } from 'react';
import { useSession } from '../session/SessionProvider';
import { RequireSession } from '../session/RequireSession';
import { community } from '../services/community';
import { Button } from '../components/Button';

interface RatingFormProps { gameId: string; onSaved?: () => void; }
function RatingControl({ gameId, onSaved }: RatingFormProps): ReactElement {
  const { user } = useSession();
  const groupId = useId();
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
    <fieldset className="star-field" disabled={pending}>
      <legend>Sua nota</legend>
      <div className="star-options">{[0, 1, 2, 3, 4, 5].map((note) => <label key={note} className={`star-option ${note > 0 && note <= Number(value) ? 'is-filled' : ''} ${note === 0 ? 'zero-option' : ''}`}>
        <input type="radio" name={groupId} value={note} checked={value === String(note)} aria-label={`${note} ${note === 1 ? 'estrela' : 'estrelas'}`} onChange={(event) => setValue(event.target.value)} />
        <span aria-hidden="true">{note === 0 ? '0' : '★'}</span>
      </label>)}</div>
      <p className="rating-selection" aria-live="polite">{value} de 5 estrelas</p>
    </fieldset>
    <Button type="submit" disabled={pending}>{pending ? 'Salvando…' : 'Salvar nota'}</Button>
    {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
  </form>;
}
export function RatingForm(props: RatingFormProps): ReactElement {
  const { user } = useSession();
  return <section aria-label="Sua avaliação"><RequireSession><RatingControl key={user?.id} {...props} /></RequireSession></section>;
}
