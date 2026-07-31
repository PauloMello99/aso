export interface AuthUser {
  id: string
  email: string
  emailVerified: boolean
}

export interface Me {
  id: string
  authId: string
  platformRole: "super_admin" | "user"
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  birthDate: string | null
  gender: "male" | "female" | "other" | null
  onboardingCompletedAt: string | null
  termsAcceptedAt: string | null
  termsVersion: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: AuthUser
}

export interface StoredSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: AuthUser
}

export interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  signUp: (
    name: string,
    email: string,
    password: string,
    acceptedTermsVersion: string,
  ) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (
    accessToken: string,
    newPassword: string,
    refreshToken?: string,
  ) => Promise<void>
}
