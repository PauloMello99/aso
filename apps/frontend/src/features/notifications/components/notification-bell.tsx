"use client"

import { Bell, CheckCheck } from "lucide-react"
import { formatDistanceToNow, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { cn } from "@/shared/lib/utils"
import { useNotifications } from "../hooks/use-notifications"

export function NotificationBell() {
  const { items, unread, markRead, markAllRead } = useNotifications()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-foreground/60 hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
          <span className="sr-only">Notificações</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-foreground/10 px-3 py-2">
          <span className="text-sm font-medium text-foreground">Notificações</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-foreground/50 transition-colors hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-foreground/30">
              Nenhuma notificação.
            </p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (!n.readAt) markRead(n.id)
                }}
                className={cn(
                  "flex w-full gap-2 px-3 py-2 text-left transition-colors hover:bg-foreground/[0.04]",
                  !n.readAt && "bg-orange-500/[0.04]",
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                    n.readAt ? "bg-transparent" : "bg-orange-400",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground/90">
                    {n.title}
                  </span>
                  {n.body && (
                    <span className="block truncate text-xs text-foreground/50">
                      {n.body}
                    </span>
                  )}
                  <span className="block text-[11px] text-foreground/30">
                    {formatDistanceToNow(parseISO(n.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
