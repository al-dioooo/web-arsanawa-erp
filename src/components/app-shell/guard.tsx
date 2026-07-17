"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { useSession } from "@/features/auth/session-provider"
import { canManageEntitlements } from "@/features/auth/access"
import { getModuleByPath } from "@/lib/modules/registry"
import { buttonVariants } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"

export function EntitlementGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const t = useTranslations()
    const { modules, organizationContext, user } = useSession()

    const activeModule = getModuleByPath(pathname)

    if (activeModule && activeModule.entitlementKey) {
        const isEnabled = modules?.enabled.includes(activeModule.entitlementKey)
        if (!isEnabled) {
            const canManageModules = canManageEntitlements(organizationContext?.membership, user)

            return (
                <EmptyState
                    icon="block"
                    className="px-4 py-20"
                    title={t("shell.guard.title")}
                    description={t.rich("shell.guard.description", {
                        module: activeModule.label,
                        strong: (chunks) => (
                            <strong className="font-semibold text-ink-secondary">{chunks}</strong>
                        ),
                    })}
                    action={
                        canManageModules ? (
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Link
                                    href="/organization/modules"
                                    className={buttonVariants({ size: "lg" })}
                                >
                                    {t("shell.guard.goToModuleManager")}
                                </Link>
                                <Link
                                    href="/"
                                    className={buttonVariants({ variant: "secondary", size: "lg" })}
                                >
                                    {t("shell.guard.backToApps")}
                                </Link>
                            </div>
                        ) : (
                            <Link href="/" className={buttonVariants({ size: "lg" })}>
                                {t("shell.guard.backToEnabledApps")}
                            </Link>
                        )
                    }
                />
            )
        }
    }

    return <>{children}</>
}
