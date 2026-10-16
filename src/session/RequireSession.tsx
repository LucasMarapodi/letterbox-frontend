import type { ReactElement, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from './SessionProvider';

export function RequireSession({ children }: { children: ReactNode }): ReactElement {
  const { user } = useSession();
  return user ? <>{children}</> : <><p>Entre para acessar este conteúdo.</p><Link to="/login">Entrar para continuar</Link></>;
}
