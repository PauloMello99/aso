import { useContext } from "react"
import { AuthContext } from "@/features/auth/providers/auth-provider"
import type { AuthContextValue } from "@/features/auth/types"

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
