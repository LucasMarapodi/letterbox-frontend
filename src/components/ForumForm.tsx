import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from './Button';
import { HttpFailure } from '../services/http/client';

function errorMessage(error: unknown): string {
  if (error instanceof HttpFailure) {
    if (error.code === 'storage_unavailable') return 'Persistência temporariamente indisponível. Seu rascunho foi mantido.';
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente.';
    if (error.status === 404) return 'Jogo ou tópico não encontrado.';
    if (error.status === 400) return 'Revise os campos e seus limites antes de tentar novamente.';
  }
  return 'Não foi possível confirmar a publicação. Confira a discussão antes de tentar novamente. Seu rascunho foi mantido.';
}
export function ForumForm({ topic = false, sending, onSubmit, onCancel }: {
  topic?: boolean; sending: React.RefObject<boolean>; onSubmit(input: { title: string; text: string }, signal: AbortSignal): Promise<void>; onCancel?(): void;
}) {
  const [title, setTitle] = useState(''), [text, setText] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { controller.current?.abort(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (sending.current) return;
    if (!text.trim() || (topic && !title.trim())) { setError('Preencha os campos obrigatórios.'); return; }
    sending.current = true; setBusy(true); setError('');
    const request = new AbortController(); controller.current = request;
    try { await onSubmit({ title: title.trim(), text: text.trim() }, request.signal); if (!request.signal.aborted) { setText(''); setTitle(''); } }
    catch (error: unknown) { if (!request.signal.aborted) setError(errorMessage(error)); }
    finally { sending.current = false; if (!request.signal.aborted) setBusy(false); }
  }
  return <form className="forum-form" onSubmit={event => { void submit(event); }} aria-busy={busy}>
    {topic && <label>Título do tópico<input required maxLength={150} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} /></label>}
    <label>{topic ? 'Mensagem inicial' : 'Sua resposta'}<textarea required maxLength={10000} value={text} disabled={busy} onChange={event => setText(event.target.value)} /></label>
    <small>{text.length}/10000 caracteres</small>
    {error && <p role="alert">{error}</p>}
    <div className="forum-form-actions"><Button type="submit" disabled={busy}>{busy ? 'Publicando…' : topic ? 'Publicar tópico' : 'Publicar resposta'}</Button>{onCancel && <Button disabled={busy} onClick={onCancel}>Cancelar</Button>}</div>
  </form>;
}
