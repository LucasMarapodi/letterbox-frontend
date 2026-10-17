import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import type { ReviewInput } from '../services/communityContracts';
import { CommunityError } from '../services/communityContracts';
import { Button } from './Button';
import { TextField } from './TextField';

export function RatedReviewForm({ initialTitle = null, initialText = '', initialRating = null, submitLabel, pendingLabel, failureMessage, onSubmit, onCancel, errorMessage, sendingRef }: {
  initialTitle?: string | null; initialText?: string; initialRating?: number | null; submitLabel: string; pendingLabel: string; failureMessage: string;
  onSubmit(input: ReviewInput): Promise<void>; onCancel(): void; errorMessage?(error: unknown): string;
  sendingRef?: RefObject<boolean>;
}) {
  const id = useId();
  const [text, setText] = useState(initialText);
  const [title, setTitle] = useState(initialTitle ?? '');
  const [rating, setRating] = useState(initialRating === null ? '' : String(initialRating));
  const [errors, setErrors] = useState<{ rating?: string; text?: string; title?: string }>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const localSending = useRef(false);
  const sending = sendingRef ?? localSending;
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); if (sending.current) return;
    const value = Number(rating);
    const next = {
      ...(!rating.trim() || !Number.isFinite(value) || value < 0 || value > 5 ? { rating: 'Escolha uma nota de 0 a 5.' } : {}),
      ...(text.trim().length > 10000 ? { text: 'Descrição deve ter até 10000 caracteres.' } : {}),
      ...(text.trim() && !title.trim() ? { title: 'Informe um título quando houver descrição.' } : {}),
      ...(title.trim().length > 150 ? { title: 'Título deve ter até 150 caracteres.' } : {}),
    };
    setErrors(next); setError(''); if (Object.keys(next).length) return;
    sending.current = true; setPending(true);
    try { await onSubmit({ rating: value, text: text.trim(), title: title.trim() || null }); }
    catch (failure: unknown) {
      if (alive.current) {
        if (failure instanceof CommunityError && (failure.code === 'review-title-required' || failure.code === 'review-title-too-long')) {
          setErrors(previous => ({ ...previous, title: failure.code === 'review-title-required' ? 'Informe um título quando houver descrição.' : 'Título deve ter até 150 caracteres.' }));
        } else setError(errorMessage?.(failure) ?? failureMessage);
      }
    }
    finally { sending.current = false; if (alive.current) setPending(false); }
  }
  return <form aria-label={submitLabel} onSubmit={submit} noValidate className="rated-review-form">
    <fieldset className="star-field" disabled={pending} aria-invalid={Boolean(errors.rating)} aria-describedby={errors.rating ? `${id}-rating-error` : undefined}>
      <legend>Sua nota</legend>
      <div className="star-options">{[0, 1, 2, 3, 4, 5].map(value => <label key={value} className={`star-option ${value > 0 && rating !== '' && value <= Number(rating) ? 'is-filled' : ''} ${value === 0 ? 'zero-option' : ''}`}>
        <input type="radio" name={id} checked={rating === String(value)} value={value} aria-label={`${value} ${value === 1 ? 'estrela' : 'estrelas'}`} onChange={event => setRating(event.target.value)} /><span aria-hidden="true">{value === 0 ? '0' : '★'}</span>
      </label>)}</div>
      <p className="rating-selection">{rating === '' ? 'Nenhuma nota selecionada.' : `Nota selecionada: ${rating} de 5`}</p>
      {errors.rating && <p id={`${id}-rating-error`} role="alert">{errors.rating}</p>}
    </fieldset>
    <TextField id={`${id}-title`} label="Título" value={title} disabled={pending} required={Boolean(text.trim())} aria-invalid={Boolean(errors.title)} aria-describedby={`${id}-title-hint${errors.title ? ` ${id}-title-error` : ''}`} onChange={event => setTitle(event.target.value)} />
    <p className="review-title-hint" id={`${id}-title-hint`}>Até 150 caracteres. Título obrigatório quando houver descrição.</p>
    {errors.title && <p id={`${id}-title-error`} role="alert">{errors.title}</p>}
    <label htmlFor={`${id}-text`}>Descrição (opcional)</label>
    <textarea id={`${id}-text`} value={text} maxLength={10000} disabled={pending} aria-invalid={Boolean(errors.text)} aria-describedby={errors.text ? `${id}-text-error` : undefined} onChange={event => setText(event.target.value)} />
    {errors.text && <p id={`${id}-text-error`} role="alert">{errors.text}</p>}
    {error && <p role="alert">{error}</p>}
    <div className="completion-actions"><Button type="submit" disabled={pending}>{pending ? pendingLabel : submitLabel}</Button><Button disabled={pending} onClick={onCancel}>Cancelar</Button></div>
  </form>;
}
