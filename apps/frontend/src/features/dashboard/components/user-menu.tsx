"use client"

import { useRouter } from "next/router"
import { Settings, LogOut, ChevronDown } from "lucide-react"
import { useAuth } from "@/features/auth/hooks/use-auth"
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
  const router = useRouter()

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
          className="h-auto gap-2 px-2 py-1.5 text-white/60 hover:text-white"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/20 text-xs font-medium text-orange-400">
            {initials}
          </span>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-white/40">
          {user?.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void router.push("/dashboard/account")}>
          <Settings className="h-4 w-4" />
          Minha Conta
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
