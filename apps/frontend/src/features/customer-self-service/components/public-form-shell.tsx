"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"

export function PublicFormCentered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-md border-foreground/5 bg-foreground/[0.03] sm:max-w-lg">
        {children}
      </Card>
    </div>
  )
}

export function PublicFormSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-foreground/30" />
    </div>
  )
}

interface PublicFormMessageCardProps {
  title: string
  description: string
}

export function PublicFormMessageCard({
  title,
  description,
}: PublicFormMessageCardProps) {
  return (
    <PublicFormCentered>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-foreground/40">
          {description}
        </CardDescription>
      </CardHeader>
    </PublicFormCentered>
  )
}
