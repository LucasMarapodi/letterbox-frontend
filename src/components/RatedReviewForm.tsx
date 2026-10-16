import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { ReviewInput } from '../services/communityContracts';
import { Button } from './Button';
import { TextField } from './TextField';

export function RatedReviewForm({ initialText = '', initialRating = null, submitLabel, pendingLabel, failureMessage, onSubmit, onCancel, errorMessage }: {
  initialText?: string; initialRating?: number | null; submitLabel: string; pendingLabel: string; failureMessage: string;
  onSubmit(input: ReviewInput): Promise<void>; onCancel(): void; errorMessage?(error: unknown): string;
}) {
  const id = useId();
  const [text, setText] = useState(initialText);
  const [rating, setRating] = useState(initialRating === null ? '' : String(initialRating));
  const [errors, setErrors] = useState<{ rating?: string; text?: string }>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const sending = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); if (sending.current) return;
    const value = Number(rating);
    const next = { ...(!rating.trim() || !Number.isFinite(value) || value < 0 || value > 5 ? { rating: 'Escolha uma nota de 0 a 5.' } : {}), ...(text.trim().length > 10000 ? { text: 'Descrição deve ter até 10000 caracteres.' } : {}) };
    setErrors(next); setError(''); if (Object.keys(next).length) return;
    sending.current = true; setPending(true);
    try { await onSubmit({ rating: value, text: text.trim() }); }
    catch (failure: unknown) { if (alive.current) setError(errorMessage?.(failure) ?? failureMessage); }
    finally { sending.current = false; if (alive.current) setPending(false); }
  }
  return <form aria-label={submitLabel} onSubmit={submit} noValidate className="rated-review-form">
    <fieldset className="star-field" disabled={pending}>
      <legend>Sua nota</legend>
      <div className="star-options">{[0, 1, 2, 3, 4, 5].map(value => <label key={value} className={`star-option ${value > 0 && rating !== '' && value <= Number(rating) ? 'is-filled' : ''} ${value === 0 ? 'zero-option' : ''}`}>
        <input type="radio" name={id} checked={rating === String(value)} value={value} aria-label={`${value} ${value === 1 ? 'estrela' : 'estrelas'}`} onChange={event => setRating(event.target.value)} /><span aria-hidden="true">{value === 0 ? '0' : '★'}</span>
      </label>)}</div>
      <TextField label="Nota (0 a 5)" type="number" min={0} max={5} step="any" value={rating} onChange={event => setRating(event.target.value)} aria-invalid={Boolean(errors.rating)} aria-describedby={errors.rating ? `${id}-rating-error` : undefined} />
      {errors.rating && <p id={`${id}-rating-error`} role="alert">{errors.rating}</p>}
    </fieldset>
    <label htmlFor={`${id}-text`}>Descrição (opcional)</label>
    <textarea id={`${id}-text`} value={text} maxLength={10000} disabled={pending} aria-invalid={Boolean(errors.text)} aria-describedby={errors.text ? `${id}-text-error` : undefined} onChange={event => setText(event.target.value)} />
    {errors.text && <p id={`${id}-text-error`} role="alert">{errors.text}</p>}
    {error && <p role="alert">{error}</p>}
    <div className="completion-actions"><Button type="submit" disabled={pending}>{pending ? pendingLabel : submitLabel}</Button><Button disabled={pending} onClick={onCancel}>Cancelar</Button></div>
  </form>;
}
