"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { useSession } from "@/features/auth/session-provider"
import { StatusPill } from "@/components/ui/status-pill"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"
import { PageHeader } from "@/components/ui/page-header"
import { moduleRegistry } from "@/lib/modules/registry"

export function ModulesView() {
    const t = useTranslations("organization.modules")
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
            <PageHeader
                eyebrow={t("eyebrow")}
                title={
                    activeCompany
                        ? t("title", { company: activeCompany.company.name })
                        : t("fallbackTitle")
                }
                subtitle={t("subtitle")}
                className="mb-0"
            />
            {error ? (
                <div className="rounded-md bg-error-soft px-4 py-3 text-sm font-medium text-error-strong">
                    {error}
                </div>
            ) : null}

            <Card as="section" padding="lg">
                <h2 className="type-section mb-6">{t("availableTitle")}</h2>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {moduleRegistry.map((moduleEntry) => {
                        const enabled = entitlementMap.get(moduleEntry.key)?.is_enabled ?? false

                        return (
                            <Card
                                as="article"
                                inset
                                key={moduleEntry.key}
                                className="flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3">
                                        <div
                                            className="flex h-11 w-11 items-center justify-center rounded-md font-brand text-lg"
                                            style={{ backgroundColor: `${moduleEntry.accentColor}15`, color: moduleEntry.accentColor }}
                                        >
                                            <Icon name={moduleEntry.icon} className="text-xl" />
                                        </div>
                                        <StatusPill tone={enabled ? "green" : "neutral"}>
                                            {enabled ? t("active") : t("disabled")}
                                        </StatusPill>
                                    </div>
                                    <h3 className="mt-4 text-base font-bold leading-tight text-ink">
                                        {moduleEntry.label}
                                    </h3>
                                    <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                                        {t("description", { module: moduleEntry.label.toLowerCase() })}
                                    </p>
                                </div>

                                <Button
                                    type="button"
                                    variant={enabled ? "outline" : "default"}
                                    className="mt-6 w-full"
                                    aria-label={
                                        enabled
                                            ? t("disableAria", { module: moduleEntry.label })
                                            : t("enableAria", { module: moduleEntry.label })
                                    }
                                    disabled={!activeCompanyId || isLoading}
                                    onClick={() => toggleModule(moduleEntry.key, !enabled)}
                                >
                                    {enabled ? t("disable") : t("enable")}
                                </Button>
                            </Card>
                        )
                    })}
                </div>
            </Card>
        </div>
    )
}
