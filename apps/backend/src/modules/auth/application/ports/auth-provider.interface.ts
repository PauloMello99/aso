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
  forgotPassword(email: string): Promise<void>;
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
