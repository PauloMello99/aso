import * as React from "react"
import { PILOT_STUDIO_COUNT } from "../constants/proof"

export function CredibilityBar() {
  return (
    <section className="border-y border-foreground/5 bg-foreground/[0.02] py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-center sm:gap-0 sm:divide-x sm:divide-foreground/10">
          <p className="text-sm text-foreground/60 sm:px-6">
            <b>Operado pela Ink House</b>: o estúdio que construiu o ASO usa o ASO
            todo dia
          </p>
          <p className="text-sm text-foreground/60 sm:px-6">
            <b>{PILOT_STUDIO_COUNT}</b> estúdios em operação
          </p>
          <p className="text-sm text-foreground/60 sm:px-6">
            <b>Dados no Brasil</b>, conforme a LGPD
          </p>
        </div>
      </div>
    </section>
  )
}
