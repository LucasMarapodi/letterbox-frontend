import { useLocation, useParams } from 'react-router-dom';
import type { Id } from '../models';

export type RouteIdParameter = 'gameId' | 'reviewId' | 'userId';

/** Para as rotas atuais, o ID é o último segmento, com barra final opcional. */
export function useOpaqueRouteId(parameter?: RouteIdParameter): Id | undefined {
  const { pathname } = useLocation();
  const params = useParams<RouteIdParameter>();
  if (!parameter || params[parameter] === undefined) return undefined;

  // useParams perde a distinção entre uma barra codificada e o texto literal %2F.
  // O pathname original mantém essa informação: decodificar exatamente uma vez.
  const segment: string | undefined = pathname.replace(/\/+$/, '').split('/').at(-1);
  if (segment === undefined) return undefined;
  try {
    return decodeURIComponent(segment);
  } catch {
    // Como no roteador, conservar texto de uma URL com escape malformado.
    return segment;
  }
}
