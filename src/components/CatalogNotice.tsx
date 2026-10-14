import { useSyncExternalStore, type ReactElement } from 'react';
import { useServices } from '../services/ServiceProvider';
import { catalogKey, type CatalogStore } from '../services/catalogMetadata';
import { Button } from './Button';
function Notice({ store, paths, onRetry }: { store: CatalogStore; paths: readonly (readonly string[])[]; onRetry?: () => void }): ReactElement | null {
  const snapshot = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
  const metadata = paths.map((path) => snapshot[catalogKey(path)]).filter((item) => item?.stale);
  if (!metadata.length) return null;
  const dates = metadata.flatMap((item) => item.fetchedAt ? [item.fetchedAt] : []).sort((a, b) => Date.parse(a) - Date.parse(b));
  // Não atribuir uma data parcial ao agregado com timestamps ausentes.
  const fetchedAt = dates.length === metadata.length ? dates[0] : null;
  return <aside className="catalog-notice" aria-label="Atualização do catálogo">
    <p>Dados do catálogo desatualizados.{fetchedAt && <> Última obtenção: <time dateTime={fetchedAt}>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' }).format(new Date(fetchedAt))} (UTC)</time>.</>}</p>
    {onRetry && <Button onClick={onRetry}>Consultar novamente</Button>}
  </aside>;
}
export function CatalogNotice({ paths, onRetry }: { paths: readonly (readonly string[])[]; onRetry?: () => void }): ReactElement | null {
  const { catalog } = useServices();
  return catalog ? <Notice store={catalog} paths={paths} onRetry={onRetry} /> : null;
}
