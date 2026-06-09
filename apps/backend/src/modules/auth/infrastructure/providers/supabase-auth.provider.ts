import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  AuthSession,
  AuthUser,
  IAuthProvider,
} from "../../application/ports/auth-provider.interface";
import { InvalidCredentialsException } from "../../domain/exceptions/invalid-credentials.exception";
import { AuthTokenExpiredException } from "../../domain/exceptions/auth-token-expired.exception";

@Injectable()
export class SupabaseAuthProvider implements IAuthProvider {
  private readonly admin: SupabaseClient;
  private readonly anon: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    const url = config.getOrThrow<string>("SUPABASE_URL");
    const opts = { auth: { autoRefreshToken: false, persistSession: false } };
    this.admin = createClient(
      url,
      config.getOrThrow<string>("SUPABASE_SERVICE_ROLE_KEY"),
      opts,
    );
    this.anon = createClient(
      url,
      config.getOrThrow<string>("SUPABASE_ANON_KEY"),
      opts,
    );
  }

  async signUp(email: string, password: string): Promise<AuthSession> {
    const { error } = await this.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new InvalidCredentialsException(error.message);
    return this.signIn(email, password);
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await this.anon.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session) {
      throw new InvalidCredentialsException(error?.message ?? "Sign in failed");
    }
    return this.mapSession(data.session, data.user);
  }

  async signOut(accessToken: string): Promise<void> {
    const { data } = await this.admin.auth.getUser(accessToken);
    if (data.user) {
      await this.admin.auth.admin.signOut(data.user.id);
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthSession> {
    const { data, error } = await this.anon.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error || !data.session) {
      throw new AuthTokenExpiredException("Invalid refresh token");
    }
    return this.mapSession(data.session, data.user!);
  }

  async forgotPassword(email: string): Promise<void> {
    const frontendUrl = this.config.get<string>(
      "FRONTEND_URL",
      "http://localhost:3000",
    );
    const { error } = await this.anon.auth.resetPasswordForEmail(email, {
      redirectTo: `${frontendUrl}/auth/reset-password`,
    });
    if (error) throw new InvalidCredentialsException(error.message);
  }

  async resetPassword(accessToken: string, newPassword: string): Promise<void> {
    const url = this.config.getOrThrow<string>("SUPABASE_URL");
    const anonKey = this.config.getOrThrow<string>("SUPABASE_ANON_KEY");
    const client = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await client.auth.setSession({
      access_token: accessToken,
      refresh_token: "",
    });
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw new InvalidCredentialsException(error.message);
  }

  async verifyToken(accessToken: string): Promise<AuthUser> {
    const { data, error } = await this.admin.auth.getUser(accessToken);
    if (error || !data.user) {
      throw new AuthTokenExpiredException("Invalid or expired token");
    }
    return {
      id: data.user.id,
      email: data.user.email!,
      emailVerified: !!data.user.email_confirmed_at,
    };
  }

  private mapSession(session: any, user: any): AuthSession {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: !!user.email_confirmed_at,
      },
    };
  }
}
