import type { ReactElement } from 'react';
import { HomePage } from './pages/HomePage';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { GameDetailsPage } from './pages/GameDetailsPage';
import type { AuthService } from './services/authContracts';
import { authService as defaultAuthService } from './services/auth';
import { SessionProvider, useSession } from './session/SessionProvider';
import { LoginPage } from './pages/LoginPage';

import { RegisterPage } from './pages/RegisterPage';

export interface AppRoutesProps { authService?: AuthService; }

function ApplicationRoutes(): ReactElement {
  const { user, signOut } = useSession();
  return <>
    <header className="site-header">
      <div className="header-inner">
      <Link className="brand" to="/" aria-label="Game Reviews"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>Game Reviews</Link>
      <nav aria-label="Navegação principal">
        <Link to="/">Início</Link>{' '}
        <Link to="/login">Entrar</Link>{' '}
        <Link to="/cadastro">Criar conta</Link>
      </nav>
      {user && <span aria-label="Usuário conectado">{user.displayName}</span>}
      {user && <button type="button" onClick={signOut}>Sair</button>}
      </div>
    </header>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/jogos/:gameId" element={<GameDetailsPage />} />
      <Route path="/reviews/:reviewId" element={<PlaceholderPage title="Review" parameter="reviewId" parameterLabel="ID da review" />} />
      <Route path="/perfil/:userId" element={<PlaceholderPage title="Perfil público" parameter="userId" parameterLabel="ID do usuário" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route path="*" element={<main><h1>Página não encontrada</h1><p>Este endereço não corresponde a uma página.</p></main>} />
    </Routes>
  </>;
}

export function AppRoutes({ authService = defaultAuthService }: AppRoutesProps): ReactElement {
  return <SessionProvider service={authService}><ApplicationRoutes /></SessionProvider>;
}

export default function App(): ReactElement {
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}

