import type { ReactElement } from "react"
import { CalendarClock } from "lucide-react"
import type { NextPageWithLayout } from "@/pages/_app"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { OrgLayout, OrgSettingsLayout } from "@/features/dashboard"

const EXTERNAL_CALENDARS = [
  { name: "Google Calendar", color: "text-sky-300" },
  { name: "Outlook Calendar", color: "text-blue-300" },
  { name: "Apple Calendar", color: "text-white/70" },
]

const SettingsAgendaPage: NextPageWithLayout = () => (
  <div className="grid gap-8">
    <div>
      <h2 className="text-lg font-semibold">Agenda</h2>
      <p className="mt-0.5 text-sm text-white/50">
        Configurações de calendário desta organização.
      </p>
    </div>

    <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-orange-400" />
        <h3 className="text-sm font-medium">Calendários externos</h3>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/40">
          Em breve
        </span>
      </div>
      <p className="mt-2 text-sm text-white/50">
        Conecte um calendário externo a esta organização para espelhar e sincronizar os eventos
        da agenda. Cada organização pode ter um calendário próprio, permitindo gerenciar
        múltiplas agendas com calendários distintos.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {EXTERNAL_CALENDARS.map((c) => (
          <button
            key={c.name}
            type="button"
            disabled
            className="flex cursor-not-allowed items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-white/60 opacity-70"
          >
            <span className={c.color}>{c.name}</span>
            <span className="text-xs text-white/30">Conectar</span>
          </button>
        ))}
      </div>
    </section>
  </div>
)

SettingsAgendaPage.getLayout = (page: ReactElement) => (
  <AuthGuard>
    <OrgLayout>
      <OrgSettingsLayout>{page}</OrgSettingsLayout>
    </OrgLayout>
  </AuthGuard>
)

export default SettingsAgendaPage
