import { useEffect, useState } from 'react';
import { Button } from './Button';

/** Recorte local: mantém a coleção original e ajusta somente páginas inválidas. */
export function useProfilePage<T>(items: readonly T[], limit: number) {
  const [requested, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / limit));
  const page = Math.min(requested, pages);
  useEffect(() => { if (requested > pages) setPage(pages); }, [requested, pages]);
  return { items: items.slice((page - 1) * limit, page * limit), page, pages, setPage };
}
export function ProfilePagination({ label, page, pages, setPage }: { label: string; page: number; pages: number; setPage(page: number): void }) {
  if (pages <= 1) return null;
  return <nav className="profile-pagination" aria-label={`Paginação de ${label}`}>
    <Button disabled={page <= 1} aria-label={`Página anterior de ${label}`} onClick={() => setPage(page - 1)}>Anterior</Button>
    <span role="status" aria-live="polite">Página {page} de {pages}</span>
    <Button disabled={page >= pages} aria-label={`Próxima página de ${label}`} onClick={() => setPage(page + 1)}>Próxima</Button>
  </nav>;
}
