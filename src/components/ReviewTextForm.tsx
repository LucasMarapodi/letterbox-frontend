import { useId, useRef, useState, type FormEvent, type ReactElement } from 'react';
import { Button } from './Button';

export interface ReviewTextFormProps {
  initialText?: string;
  label?: string;
  emptyMessage?: string;
  submitLabel: string;
  pendingLabel: string;
  failureMessage: string;
  onSubmit(text: string): Promise<void>;
}
export function ReviewTextForm({ initialText = '', label = 'Sua review', emptyMessage = 'Escreva sua review.', submitLabel, pendingLabel, failureMessage, onSubmit }: ReviewTextFormProps): ReactElement {
  const id = useId();
  const [text, setText] = useState(initialText);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const sending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (sending.current) return;
    if (!text.trim()) { setError(emptyMessage); return; }
    sending.current = true; setPending(true); setError('');
    try { await onSubmit(text); }
    catch { setError(failureMessage); }
    finally { sending.current = false; setPending(false); }
  }
  return <form onSubmit={submit} aria-label={submitLabel}>
    <label htmlFor={id}>{label}</label>
    <textarea id={id} value={text} disabled={pending} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => setText(event.target.value)} />
    {error && <p id={`${id}-error`} role="alert">{error}</p>}
    <Button type="submit" disabled={pending}>{pending ? pendingLabel : submitLabel}</Button>
  </form>;
}
