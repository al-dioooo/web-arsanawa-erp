"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useSession } from "@/features/auth/session-provider"
import Logo from "@/components/brands/logo"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useSession()
    const router = useRouter()
    const t = useTranslations()

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.replace("/")
        }
    }, [isAuthenticated, isLoading, router])

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-canvas">
                <div className="text-center">
                    <div className="mb-4 flex justify-center">
                        <div className="h-12 w-12 motion-safe:animate-spin rounded-pill border-4 border-brand-soft border-t-brand" />
                    </div>
                    <Logo color="teal" className="h-8 w-auto mx-auto dark:hidden" />
                    <Logo color="white" className="hidden h-8 w-auto mx-auto dark:block" />
                    <p className="mt-2 font-body text-xs text-ink-muted">{t("common.states.loading")}</p>
                </div>
            </div>
        )
    }

    if (isAuthenticated) {
        return null
    }

    return <>{children}</>
}
