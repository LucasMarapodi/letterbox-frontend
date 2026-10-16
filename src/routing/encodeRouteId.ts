import type { Id, UserId } from '../models';

/** Evita segmentos de diretório, inclusive sua normalização pelo navegador. */
export function encodeRouteId(id: Id | UserId): string {
  if (id === '.' || id === '..') return `~${id}`;
  // Escapar ~ impede colisões de IDs literais ~. e ~.. com os marcadores.
  return encodeURIComponent(id).replace(/~/g, '%7E');
}
