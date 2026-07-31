import React, { createContext, useEffect, useState } from "react"
import { apiRequest } from "@/infrastructure/api/client"
import { clearSession, getSession, saveSession } from "@/features/auth/lib/session"
import type { AuthContextValue, AuthSession, AuthUser } from "@/features/auth/types"

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = getSession()
    if (session) setUser(session.user)
    setLoading(false)
  }, [])

  const signUp = async (
    name: string,
    email: string,
    password: string,
    acceptedTermsVersion: string,
  ): Promise<void> => {
    const session = await apiRequest<AuthSession>("/auth/sign-up", {
      method: "POST",
      body: JSON.stringify({ name, email, password, acceptedTermsVersion }),
      skipAuth: true,
    })
    saveSession(session)
    setUser(session.user)
  }

  const signIn = async (email: string, password: string): Promise<void> => {
    const session = await apiRequest<AuthSession>("/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    })
    saveSession(session)
    setUser(session.user)
  }

  const signOut = async (): Promise<void> => {
    try {
      await apiRequest("/auth/sign-out", { method: "POST" })
    } finally {
      clearSession()
      setUser(null)
    }
  }

  const forgotPassword = async (email: string): Promise<void> => {
    await apiRequest("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
      skipAuth: true,
    })
  }

  const resetPassword = async (
    accessToken: string,
    newPassword: string,
    refreshToken?: string,
  ): Promise<void> => {
    await apiRequest("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ accessToken, newPassword, refreshToken }),
      skipAuth: true,
    })
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, signUp, signIn, signOut, forgotPassword, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  )
}
