"use client"

import { useMemo } from "react"
import { useSession } from "@/features/auth/session-provider"
import { StatusPill } from "@/components/ui/status-pill"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { moduleRegistry } from "@/lib/modules/registry"

export function ModulesView() {
    const {
        activeCompanyId,
        companies,
        entitlements,
        error,
        updateEntitlements,
        isLoading
    } = useSession()

    const activeCompany = companies.find((entry) => entry.company.id === activeCompanyId)

    const entitlementMap = useMemo(
        () => new Map(entitlements.map((e) => [e.module, e])),
        [entitlements]
    )

    async function toggleModule(moduleName: string, enabled: boolean) {
        if (!activeCompanyId) return

        const modulesPayload = moduleRegistry.map((moduleEntry) => {
            const entitlement = entitlementMap.get(moduleEntry.key)

            if (moduleEntry.key === moduleName) {
                return {
                    module: moduleEntry.key,
                    is_enabled: enabled,
                    expires_at: entitlement?.expires_at ?? null,
                }
            }

            return {
                module: moduleEntry.key,
                is_enabled: entitlement?.is_enabled ?? false,
                expires_at: entitlement?.expires_at ?? null,
            }
        })

        await updateEntitlements(activeCompanyId, { modules: modulesPayload })
    }

    return (
        <div className="grid gap-6">
            <section className="rounded-2xl border border-navy-100 bg-white p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-teal-700 font-display">
                    Module Manager
                </p>
                <h1 className="mt-2 text-2xl font-brand font-bold text-navy-900">
                    {activeCompany ? `${activeCompany.company.name} Modules` : "Select a company context"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-500 font-body">
                    Enable or disable core business modules for this company. Enabling a module grants access to authorized memberships.
                </p>
                {error ? (
                    <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
                        {error}
                    </div>
                ) : null}
            </section>

            <section className="rounded-2xl border border-navy-100 bg-white p-6">
                <h2 className="text-lg font-bold text-navy-900 font-display mb-6">Available Modules</h2>
                
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {moduleRegistry.map((moduleEntry) => {
                        const enabled = entitlementMap.get(moduleEntry.key)?.is_enabled ?? false

                        return (
                            <article key={moduleEntry.key} className="flex flex-col justify-between rounded-xl border border-navy-100 bg-navy-50/20 p-5 transition-all hover:border-navy-200">
                                <div>
                                    <div className="flex items-start justify-between gap-3">
                                        <div
                                            className="flex h-11 w-11 items-center justify-center rounded-xl font-brand text-lg"
                                            style={{ backgroundColor: `${moduleEntry.accentColor}15`, color: moduleEntry.accentColor }}
                                        >
                                            <Icon name={moduleEntry.icon} className="text-xl" />
                                        </div>
                                        <StatusPill tone={enabled ? "green" : "neutral"}>
                                            {enabled ? "Active" : "Disabled"}
                                        </StatusPill>
                                    </div>
                                    <h3 className="mt-4 text-base font-bold text-navy-900 leading-tight">
                                        {moduleEntry.label}
                                    </h3>
                                    <p className="mt-2 text-xs leading-relaxed text-navy-500 font-body">
                                        Manage {moduleEntry.label.toLowerCase()} operations, analytics, and tenant database mappings.
                                    </p>
                                </div>
                                
                                <Button
                                    type="button"
                                    variant={enabled ? "outline" : "default"}
                                    className="mt-6 w-full cursor-pointer"
                                    aria-label={`${enabled ? "Disable" : "Enable"} ${moduleEntry.label} module`}
                                    disabled={!activeCompanyId || isLoading}
                                    onClick={() => toggleModule(moduleEntry.key, !enabled)}
                                >
                                    {enabled ? "Disable Module" : "Enable Module"}
                                </Button>
                            </article>
                        )
                    })}
                </div>
            </section>
        </div>
    )
}
