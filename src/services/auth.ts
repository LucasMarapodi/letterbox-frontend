import { createMockAuthService } from '../mocks/authService';
import type { AuthService } from './authContracts';

/** Ponto de seleção do adaptador de autenticação; substituível sem alterar telas. */
export const authService: AuthService = createMockAuthService();
