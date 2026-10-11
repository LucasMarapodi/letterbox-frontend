import { useRef, useState, type FormEvent, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { AuthError } from '../services/authContracts';
import { useSession } from '../session/SessionProvider';

type LoginErrors = Partial<Record<'email' | 'password', string>>;
type LoginFeedback = { status: 'idle' } | { status: 'pending' } | { status: 'error'; message: string };

export function LoginPage(): ReactElement {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [feedback, setFeedback] = useState<LoginFeedback>({ status: 'idle' });
  const sending = useRef<boolean>(false);
  const pending: boolean = feedback.status === 'pending';

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (sending.current) return;
    const nextErrors: LoginErrors = {};
    if (!email.trim()) nextErrors.email = 'Informe o e-mail.';
    if (!password) nextErrors.password = 'Informe a senha.';
    setErrors(nextErrors);
    setFeedback({ status: 'idle' });
    if (Object.keys(nextErrors).length) return;
    sending.current = true;
    setFeedback({ status: 'pending' });
    try {
      await signIn({ email, password });
      navigate('/', { replace: true });
    } catch (error: unknown) {
      setFeedback({ status: 'error', message: error instanceof AuthError && error.code === 'invalid-credentials'
        ? 'E-mail ou senha inválidos.' : 'Não foi possível entrar. Tente novamente.' });
    } finally { sending.current = false; }
  }

  return <main className="auth-page">
    <h1>Entrar</h1>
    <form aria-label="Login" noValidate onSubmit={submit}>
      <TextField id="login-email" label="E-mail" type="email" autoComplete="username" required disabled={pending} value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'login-email-error' : undefined} />
      {errors.email && <p id="login-email-error" role="alert">{errors.email}</p>}
      <TextField id="login-password" label="Senha" type="password" autoComplete="current-password" required disabled={pending} value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'login-password-error' : undefined} />
      {errors.password && <p id="login-password-error" role="alert">{errors.password}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Entrando…' : 'Entrar'}</Button>
    </form>
    {feedback.status === 'pending' && <p role="status">Entrando…</p>}
    {feedback.status === 'error' && <p role="alert">{feedback.message}</p>}
    <p>Não tem conta? <Link to="/cadastro">Criar uma conta</Link></p>
  </main>;
}
