import type { User } from '../models';

/** Registro público compartilhado apenas pelos adaptadores mockados da mesma instância. */
export interface MockUserStore { users: User[]; }
export interface MockSessionStore { user: User | null; }
