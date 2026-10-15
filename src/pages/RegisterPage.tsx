import { useRef, useState, type FormEvent, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { AuthError } from '../services/authContracts';
import { useSession } from '../session/SessionProvider';

type RegistrationErrors = Partial<Record<'name' | 'email' | 'password', string>>;
type RegistrationFeedback = { status: 'idle' } | { status: 'pending' } | { status: 'error'; message: string };

export function RegisterPage(): ReactElement {
  const { authService } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [feedback, setFeedback] = useState<RegistrationFeedback>({ status: 'idle' });
  const sending = useRef<boolean>(false);
  const pending: boolean = feedback.status === 'pending';

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (sending.current) return;
    const nextErrors: RegistrationErrors = {};
    if (!name.trim()) nextErrors.name = 'Informe o nome.';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Informe um e-mail válido.';
    if (!email.trim()) nextErrors.email = 'Informe o e-mail.';
    if (!password) nextErrors.password = 'Informe a senha.';
    setErrors(nextErrors);
    setFeedback({ status: 'idle' });
    if (Object.keys(nextErrors).length) return;
    sending.current = true;
    setFeedback({ status: 'pending' });
    try {
      await authService.register({ name, email, password });
      setPassword('');
      navigate('/login', { replace: true, state: { registrationComplete: true } });
    } catch (error: unknown) {
      setFeedback({ status: 'error', message: error instanceof AuthError && error.code === 'storage-unavailable' ? 'O armazenamento está temporariamente indisponível. Tente novamente.' : error instanceof AuthError && error.code === 'duplicate-email'
        ? 'Este e-mail já está cadastrado.' : error instanceof AuthError && error.code === 'invalid-fields' ? 'Os dados do cadastro são inválidos. Confira os campos.' : 'Não foi possível criar a conta. Tente novamente.' });
    } finally { sending.current = false; }
  }

  return <main className="auth-page">
    <h1>Criar conta</h1>
    <form aria-label="Cadastro" noValidate onSubmit={submit}>
      <TextField id="register-name" label="Nome" autoComplete="name" required disabled={pending} value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'register-name-error' : undefined} />
      {errors.name && <p id="register-name-error" role="alert">{errors.name}</p>}
      <TextField id="register-email" label="E-mail" type="email" autoComplete="username" required disabled={pending} value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'register-email-error' : undefined} />
      {errors.email && <p id="register-email-error" role="alert">{errors.email}</p>}
      <TextField id="register-password" label="Senha" type="password" autoComplete="new-password" required disabled={pending} value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'register-password-error' : undefined} />
      {errors.password && <p id="register-password-error" role="alert">{errors.password}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Criando conta…' : 'Criar conta'}</Button>
    </form>
    {feedback.status === 'pending' && <p role="status">Criando conta…</p>}
    {feedback.status === 'error' && <p role="alert">{feedback.message}</p>}
    <p>Já tem conta? <Link to="/login">Entrar</Link></p>
  </main>;
}
