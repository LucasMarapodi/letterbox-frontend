import { ForumTopicPage } from './pages/ForumTopicPage';
import { useRef, type ReactElement } from 'react';
import { HomePage } from './pages/HomePage';
import { BrowserRouter, Link, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { ProfilePage } from './pages/ProfilePage';
import { GameDetailsPage } from './pages/GameDetailsPage';
import type { AuthService } from './services/authContracts';
import { ServiceProvider, useServices } from './services/ServiceProvider';
import { SessionProvider, useSession } from './session/SessionProvider';
import { LoginPage } from './pages/LoginPage';

import { RegisterPage } from './pages/RegisterPage';
import { ReviewPage } from './pages/ReviewPage';
import { Avatar } from './components/Avatar';
import { encodeRouteId } from './routing/encodeRouteId';
import { NotificationBell } from './components/NotificationBell';
import type { ApplicationServices } from './services/runtime';
import { CommunityPage } from './pages/CommunityPage';
import { FavoritesProvider } from './components/FavoritesProvider';
import { ReviewLikesProvider } from './components/ReviewLikesProvider';
import { MenuSearch } from './components/MenuSearch';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { searchUrl } from './routing/searchUrl';

export interface AppRoutesProps { authService?: AuthService; adapters?: ApplicationServices; }

function ApplicationRoutes(): ReactElement {
  const { user, signOut, signingOut, notice, version } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;
  function logout(): void {
    // signOut limpa a sessão antes do primeiro await; a resposta remota não navega.
    void signOut();
    navigate('/', { replace: true });
  }
  const { privateFeatures } = useServices();
  const contentRef = useRef<HTMLDivElement>(null);
  return <>
    <a className="skip-link" href="#conteudo-principal" onClick={(event) => { event.preventDefault(); contentRef.current?.focus(); }}>Ir para o conteúdo principal</a>
    <header className="site-header">
      <div className="header-inner">
      <Link className="brand" to="/" aria-label="Game Reviews"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>Game Reviews</Link>
      <div className="header-controls">
      <MenuSearch onSearch={term => navigate(searchUrl(term))} />
      <nav aria-label="Navegação principal">
        <Link to="/">Início</Link>{' '}
        <Link to="/comunidade">Comunidade</Link>
        {user && privateFeatures?.notifications !== false && <NotificationBell key={`${version}-${user.id}`} />}
        {!user && <><Link to="/login">Entrar</Link>{' '}<Link className="signup-link" to="/cadastro">Criar conta</Link></>}
      </nav>
      {user && <div className="session-menu"><Link aria-label="Meu perfil" to={`/perfil/${encodeRouteId(user.id)}`} className="session-user"><Avatar name={user.displayName} src={user.avatarUrl} /><span aria-label="Usuário conectado">{user.displayName}</span></Link><button className="logout-button" type="button" disabled={signingOut} onClick={logout}>Sair <span aria-hidden="true">↗</span></button></div>}
      </div>
      </div>
    </header>
    {signingOut && <p className="session-notice" role="status">Encerrando sessão…</p>}
    {notice && <p className="session-notice" role="alert">{notice}</p>}
    <FavoritesProvider key={`${user ? `${version}-${user.id}` : 'visitor'}-${pathname}`}><ReviewLikesProvider><div ref={contentRef} id="conteudo-principal" role="region" aria-label="Conteúdo principal" tabIndex={-1}><Routes>
      <Route path="/" element={<HomePage authenticated={Boolean(user)} />} />
      <Route path="/comunidade" element={<CommunityPage />} />
      <Route path="/pesquisa" element={<SearchResultsPage />} />
      <Route path="/jogos/:gameId/forum/:topicId" element={<ForumTopicPage />} />
      <Route path="/jogos/:gameId" element={<GameDetailsPage />} />
      <Route path="/reviews/:reviewId" element={<ReviewPage />} />
      <Route path="/perfil/:userId" element={<ProfilePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route path="*" element={<main><h1>Página não encontrada</h1><p>Este endereço não corresponde a uma página.</p></main>} />
    </Routes></div></ReviewLikesProvider></FavoritesProvider>
  </>;
}

function ConfiguredRoutes({ authService }: Pick<AppRoutesProps, 'authService'>): ReactElement {
  const { auth } = useServices();
  return <SessionProvider service={authService ?? auth}><ApplicationRoutes /></SessionProvider>;
}
export function AppRoutes({ authService, adapters }: AppRoutesProps): ReactElement {
  return <ServiceProvider value={adapters}><ConfiguredRoutes authService={authService} /></ServiceProvider>;
}

export default function App(): ReactElement {
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}

