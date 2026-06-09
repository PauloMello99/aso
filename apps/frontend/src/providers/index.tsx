import React from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "@/features/auth"
import { TooltipProvider } from "@/shared/components/ui/tooltip"
import { queryClient } from "@/infrastructure/query/query-client"

interface AppProvidersProps {
  children: React.ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
