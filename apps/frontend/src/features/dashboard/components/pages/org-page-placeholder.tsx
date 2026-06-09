import * as React from "react"
import { Construction } from "lucide-react"

interface OrgPagePlaceholderProps {
  title: string
  description?: string
}

export function OrgPagePlaceholder({ title, description }: OrgPagePlaceholderProps) {
  return (
    <div className="flex flex-col">
      {/* Page title */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold text-white sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-white/40">{description}</p>
        )}
      </div>

      {/* Placeholder content */}
      <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-dashed border-white/[0.08]">
        <div className="text-center">
          <Construction className="mx-auto mb-3 h-8 w-8 text-white/20" />
          <p className="text-sm font-medium text-white/30">Em construção</p>
          <p className="mt-1 text-xs text-white/20">
            Esta seção estará disponível em breve
          </p>
        </div>
      </div>
    </div>
  )
}
