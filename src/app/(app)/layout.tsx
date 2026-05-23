"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/features/auth/session-provider"
import { AppShell } from "@/components/app-shell/app-shell"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-teal-100 border-t-teal-700" />
          </div>
          <p className="font-brand text-2xl text-teal-700">Arsanawa ERP</p>
          <p className="mt-1 font-body text-xs text-navy-500">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <AppShell>{children}</AppShell>
}
