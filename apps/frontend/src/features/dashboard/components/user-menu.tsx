"use client"

import { useRouter } from "next/router"
import { Settings, LogOut, ChevronDown, ShieldCheck } from "lucide-react"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useMe } from "@/features/auth/hooks/use-me"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

export function UserMenu() {
  const { user, signOut } = useAuth()
  const { me } = useMe()
  const router = useRouter()
  const isSuperAdmin = me?.platformRole === "super_admin"

  const handleSignOut = async () => {
    await signOut()
    await router.replace("/auth/login")
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          data-tour="user-menu"
          className="h-auto gap-2 px-2 py-1.5 text-foreground/60 hover:text-foreground"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
            {initials}
          </span>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-foreground/40">
          {user?.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void router.push("/dashboard/account")}>
          <Settings className="h-4 w-4" />
          Minha Conta
        </DropdownMenuItem>
        {isSuperAdmin && (
          <DropdownMenuItem onClick={() => void router.push("/admin")}>
            <ShieldCheck className="h-4 w-4" />
            Painel da plataforma
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
