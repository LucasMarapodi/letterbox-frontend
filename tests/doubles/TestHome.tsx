import type { ComponentProps, ReactElement } from 'react';
import { Link } from 'react-router-dom';
import type { HomePage } from '../../src/pages/HomePage';
/** Controles de navegação da suíte, ausentes do bundle da aplicação. */
export function testHome(Component: typeof HomePage): (props: ComponentProps<typeof HomePage>) => ReactElement {
  return (props) => <><Component {...props} /><nav aria-label="Rotas dos testes"><Link to="/jogos/1">Jogo de exemplo</Link><Link to="/reviews/review-1">Review de exemplo</Link><Link to="/perfil/1">Perfil de exemplo</Link></nav></>;
}
