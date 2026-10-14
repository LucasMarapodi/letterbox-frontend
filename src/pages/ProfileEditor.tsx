import { useId, useRef, useState, type FormEvent, type ReactElement } from 'react';
import type { User } from '../models';
import type { ProfileChanges } from '../services/authContracts';
import { AuthError } from '../services/authContracts';
import { useSession } from '../session/SessionProvider';
import { TextField } from '../components/TextField';
import { Button } from '../components/Button';
function Editor({ profile, onSaved }: { profile: User; onSaved(user: User): void }): ReactElement {
  const { authService } = useSession();
  const id = useId();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const sending = useRef(false);
  const changes: ProfileChanges = {
    ...(displayName !== profile.displayName ? { displayName: displayName.trim() } : {}),
    ...(bio !== profile.bio ? { bio } : {}),
    ...(avatarUrl !== (profile.avatarUrl ?? '') ? { avatarUrl: avatarUrl.trim() || null } : {}),
  };
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); if (sending.current || !authService.editProfile) return;
    setSuccess(false); setError('');
    if (!displayName.trim() || displayName.trim().length > 100) { setError('Nome de exibição deve ter de 1 a 100 caracteres.'); return; }
    if (bio.length > 2000) { setError('Biografia deve ter até 2000 caracteres.'); return; }
    if (avatarUrl.trim()) {
      let url: URL;
      try { url = new URL(avatarUrl.trim()); } catch { setError('URL do avatar deve usar HTTP ou HTTPS e ter até 2048 caracteres.'); return; }
      if (!['http:', 'https:'].includes(url.protocol) || avatarUrl.trim().length > 2048) { setError('URL do avatar deve usar HTTP ou HTTPS e ter até 2048 caracteres.'); return; }
    }
    sending.current = true; setPending(true);
    try { const updated = await authService.editProfile(changes); setDisplayName(updated.displayName); setBio(updated.bio); setAvatarUrl(updated.avatarUrl ?? ''); onSaved(updated); setSuccess(true); }
    catch (error: unknown) { setError(error instanceof AuthError && error.code === 'invalid-fields' ? 'Verifique os dados do perfil.' : 'Não foi possível atualizar o perfil. Tente novamente.'); }
    finally { sending.current = false; setPending(false); }
  }
  return <section className="review-card" aria-label="Editar meu perfil"><h2>Editar meu perfil</h2>
    <form onSubmit={submit} noValidate aria-label="Editar perfil" className="auth-form">
      <TextField label="Nome de exibição" value={displayName} maxLength={100} disabled={pending} onChange={(event) => setDisplayName(event.target.value)} />
      <label htmlFor={id}>Biografia</label><textarea id={id} value={bio} maxLength={2000} disabled={pending} onChange={(event) => setBio(event.target.value)} />
      <TextField label="URL do avatar" value={avatarUrl} maxLength={2048} disabled={pending} onChange={(event) => setAvatarUrl(event.target.value)} />
      <p>Deixe a URL vazia para remover a foto.</p>
      {error && <p role="alert">{error}</p>}
      <Button type="submit" disabled={pending || !Object.keys(changes).length}>{pending ? 'Salvando perfil…' : 'Salvar perfil'}</Button>
    </form>{success && <p role="status">Perfil atualizado.</p>}
  </section>;
}
export function ProfileEditor(props: { profile: User; onSaved(user: User): void }): ReactElement | null {
  const { user, version, authService } = useSession();
  return user?.id === props.profile.id && authService.editProfile ? <Editor key={`${version}-${user.id}`} {...props} /> : null;
}
