export const AUTH_PROVIDER = Symbol("AUTH_PROVIDER");

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

export interface IAuthProvider {
  signUp(email: string, password: string): Promise<AuthSession>;
  signIn(email: string, password: string): Promise<AuthSession>;
  signOut(accessToken: string): Promise<void>;
  refreshToken(refreshToken: string): Promise<AuthSession>;
  /**
   * Gera o link de recuperação de senha (sem enviar e-mail — o envio é nosso,
   * via Resend + React Email). Retorna `null` se o usuário não existir (evita
   * enumeração de e-mail). O link redireciona para FRONTEND_URL/auth/reset-password.
   */
  generatePasswordResetLink(email: string): Promise<string | null>;
  resetPassword(
    accessToken: string,
    newPassword: string,
    refreshToken?: string,
  ): Promise<void>;
  verifyToken(accessToken: string): Promise<AuthUser>;
  /** Atualiza o e-mail de login (identidade) do usuário no provedor. */
  updateEmail(authId: string, email: string): Promise<void>;
  /** Remove a identidade do usuário no provedor (exclusão de conta). */
  deleteUser(authId: string): Promise<void>;
}
