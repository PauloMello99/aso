import React from "react"
import { ThemeProvider } from "next-themes"
import { QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "@/features/auth"
import { TooltipProvider } from "@/shared/components/ui/tooltip"
import { queryClient } from "@/infrastructure/query/query-client"

interface AppProvidersProps {
  children: React.ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    // Tema via classe `.dark`/`.light` no <html> (next-themes). Default dark
    // preserva a aparência atual; `system` segue a preferência do SO. THEME-1.
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
