import { isLocalId, type LocalId } from '../models';
import { useOpaqueRouteId } from './useOpaqueRouteId';

export function useLocalRouteId(parameter: 'userId' | 'gameId' | 'reviewId'): LocalId | undefined {
  const segment = useOpaqueRouteId(parameter);
  if (!segment || !/^[1-9]\d*$/.test(segment)) return undefined;
  const value = Number(segment);
  return isLocalId(value) ? value : undefined;
}
