import { Link } from 'react-router-dom';
import { Avatar } from './Avatar';
import { Button } from './Button';
import type { ForumAuthor } from '../services/forumContracts';

export function ForumByline({ author, date }: { author: ForumAuthor; date: string }) {
  return <div className="forum-byline"><Avatar name={author.displayName} src={author.avatarUrl} /><Link to={`/perfil/${author.id}`}>{author.displayName}</Link><time dateTime={date}>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date))}</time></div>;
}
export function ForumPagination({ label, page, hasNext, busy, onPage }: { label: string; page: number; hasNext: boolean; busy: boolean; onPage(page: number): void }) {
  return <nav className="catalog-pagination" aria-label={label}><Button disabled={busy || page <= 1} onClick={() => onPage(page - 1)}>Anterior</Button><span aria-live="polite">Página {page}</span><Button disabled={busy || !hasNext} onClick={() => onPage(page + 1)}>Próxima</Button></nav>;
}
