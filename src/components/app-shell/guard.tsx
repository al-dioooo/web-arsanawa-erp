"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "@/features/auth/session-provider"
import { getModuleByPath } from "@/lib/modules/registry"
import { Icon } from "@/components/ui/icon"

export function EntitlementGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { modules, organizationContext } = useSession()

    const activeModule = getModuleByPath(pathname)

    if (activeModule && activeModule.entitlementKey) {
        const isEnabled = modules?.enabled.includes(activeModule.entitlementKey)
        if (!isEnabled) {
            const isAdmin = organizationContext?.membership?.role === "admin"

            return (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-500 mb-6">
                        <Icon name="block" className="text-3xl" />
                    </div>
                    <h2 className="text-2xl font-brand font-bold text-navy-900">
                        Module Not Entitled
                    </h2>
                    <p className="mt-2 max-w-md text-sm text-navy-500 font-body leading-relaxed">
                        The <strong className="text-navy-700 font-semibold">{activeModule.label}</strong> module is not currently enabled for this company context.
                    </p>

                    {isAdmin ? (
                        <div className="mt-8 flex flex-col sm:flex-row gap-3">
                            <Link
                                href="/organization/modules"
                                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-teal-700 hover:bg-teal-900 px-5 text-sm font-semibold text-white transition-all cursor-pointer"
                            >
                                Go to Module Manager
                            </Link>
                            <Link
                                href="/"
                                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-navy-250 bg-white hover:bg-navy-50 px-5 text-sm font-semibold text-navy-700 transition-all cursor-pointer"
                            >
                                Back to Apps
                            </Link>
                        </div>
                    ) : (
                        <Link
                            href="/"
                            className="mt-6 inline-flex min-h-10 items-center justify-center rounded-xl bg-teal-700 hover:bg-teal-900 px-5 text-sm font-semibold text-white transition-all cursor-pointer"
                        >
                            Back to Enabled Apps
                        </Link>
                    )}
                </div>
            )
        }
    }

    return <>{children}</>
}
