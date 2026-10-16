import { defaultApplicationServices } from './runtime';
import type { AuthService } from './authContracts';

/** Ponto de seleção do adaptador de autenticação; substituível sem alterar telas. */
export const authService: AuthService = defaultApplicationServices.auth;
