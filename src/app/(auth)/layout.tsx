"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/features/auth/session-provider"
import Logo from "@/components/brands/logo"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.replace("/")
        }
    }, [isAuthenticated, isLoading, router])

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="mb-4 flex justify-center">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-teal-100 border-t-teal-700" />
                    </div>
                    <Logo color="teal" className="h-8 w-auto mx-auto" />
                    <p className="mt-2 font-body text-xs text-navy-500">Loading secure console...</p>
                </div>
            </div>
        )
    }

    if (isAuthenticated) {
        return null
    }

    return <>{children}</>
}
