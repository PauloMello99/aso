import * as React from "react"
import { TopHeader } from "@/features/dashboard/components/top-header"
import type { BreadcrumbItem } from "@/features/dashboard/components/top-header"
import { Seo } from "@/shared/components/seo"

interface DashboardLayoutProps {
  children: React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
}

export function DashboardLayout({
  children,
  breadcrumbs = [],
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Seo title="Painel" noindex />
      <TopHeader breadcrumbs={breadcrumbs} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">{children}</div>
      </main>
    </div>
  )
}
