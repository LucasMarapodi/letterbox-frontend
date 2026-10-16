import { mockServices } from '../mocks/services';
import type { AuthService } from './authContracts';

/** Ponto de seleção do adaptador de autenticação; substituível sem alterar telas. */
export const authService: AuthService = mockServices.auth;
