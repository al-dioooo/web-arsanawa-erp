"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"

import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Icon } from "@/components/ui/icon"
import { StatusPill } from "@/components/ui/status-pill"
import { useSession } from "@/features/auth/session-provider"
import { buildConsoleTiles, type ConsoleTile } from "@/lib/console/tiles"
import { moduleRegistry, type ModuleEntry } from "@/lib/modules/registry"

/**
 * The application launcher shown on the home dashboard. It surfaces:
 *
 * - Every **enabled** module app for the active company (with the
 *   admin-only "available to install" section below).
 * - The **console** utilities (Organization, Profile, Module Manager, …).
 *
 * Extracted from the old console page — the entitlement logic and the
 * admin install section are behaviorally unchanged; only the chrome moved
 * onto the Card primitives.
 */
export function LauncherGrid() {
    const { user, modules, activeCompanyId, companies, organizationContext } = useSession()
    const t = useTranslations()

    const activeCompany = companies.find((c) => c.company.id === activeCompanyId)?.company
    const consoleTiles = buildConsoleTiles({
        t,
        activeCompany,
        membership: organizationContext?.membership,
        user,
        withDescriptions: true,
    })
    const canManageModules = consoleTiles.some((tile) => tile.key === "module-manager")

    const enabledSet = new Set(modules?.enabled ?? [])
    const availableSet = new Set(modules?.available ?? [])

    const enabledModules = moduleRegistry.filter((m) => enabledSet.has(m.key))
    const installableModules = moduleRegistry.filter(
        (m) => !enabledSet.has(m.key) && availableSet.has(m.key),
    )

    return (
        <div className="grid gap-8">
            {activeCompany && (
                <section className="grid gap-5">
                    <div className="flex items-center justify-between">
                        <h2 className="type-section">{t("console.applications")}</h2>
                        <StatusPill tone="green">
                            {t("console.activeCount", { count: enabledModules.length })}
                        </StatusPill>
                    </div>

                    {enabledModules.length > 0 ? (
                        <TileGrid
                            tiles={enabledModules.map((m) => ({
                                key: m.key,
                                label: m.label,
                                icon: m.icon,
                                accentColor: m.accentColor,
                                route: m.route,
                                description: defaultDescription(m, t),
                            }))}
                        />
                    ) : (
                        <Card inset padding="lg">
                            <EmptyState
                                compact
                                icon="info"
                                title={t("console.noApplications")}
                                description={
                                    canManageModules
                                        ? t("console.openModuleManagerHint")
                                        : t("console.askAdminHint")
                                }
                                action={
                                    canManageModules ? (
                                        <Link
                                            href="/organization/modules"
                                            className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md bg-brand px-4 text-xs font-bold text-white transition-colors hover:bg-brand-hover"
                                        >
                                            {t("console.openModuleManager")}
                                        </Link>
                                    ) : undefined
                                }
                            />
                        </Card>
                    )}

                    {canManageModules && installableModules.length > 0 && (
                        <div className="grid gap-3">
                            <p className="type-card-label">{t("console.availableToInstall")}</p>
                            <TileGrid
                                tiles={installableModules.map((m) => ({
                                    key: m.key,
                                    label: m.label,
                                    icon: m.icon,
                                    accentColor: m.accentColor,
                                    route: "/organization/modules",
                                    description: defaultDescription(m, t),
                                    dimmed: true,
                                }))}
                            />
                        </div>
                    )}
                </section>
            )}

            <section className="grid gap-5">
                <h2 className="type-section">{t("console.section")}</h2>
                <TileGrid tiles={consoleTiles} />
            </section>
        </div>
    )
}

type Tile = ConsoleTile & { dimmed?: boolean }

function TileGrid({ tiles }: { tiles: Tile[] }) {
    const t = useTranslations()

    return (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tiles.map((tile) => (
                <Card
                    key={tile.key}
                    as="article"
                    padding="lg"
                    hover={!tile.dimmed}
                    className={`flex flex-col justify-between ${tile.dimmed ? "opacity-60" : ""}`}
                >
                    <div>
                        <div
                            className="flex h-12 w-12 items-center justify-center rounded-md"
                            style={{
                                backgroundColor: `${tile.accentColor}15`,
                                color: tile.accentColor,
                            }}
                        >
                            <Icon name={tile.icon} className="text-2xl" />
                        </div>
                        <h3 className="type-section mt-5 leading-tight">{tile.label}</h3>
                        {tile.description ? (
                            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                                {tile.description}
                            </p>
                        ) : null}
                    </div>
                    <div className="mt-6 border-t border-line pt-5">
                        <Link
                            href={tile.route}
                            className="inline-flex w-full min-h-10 cursor-pointer items-center justify-center rounded-md text-xs font-bold text-white transition-all hover:brightness-95"
                            style={{ backgroundColor: tile.accentColor }}
                        >
                            {tile.dimmed ? t("common.install") : t("common.open")}
                        </Link>
                    </div>
                </Card>
            ))}
        </div>
    )
}

function defaultDescription(
    m: ModuleEntry,
    t: (key: string, values?: Record<string, string | number>) => string,
): string {
    switch (m.key) {
        case "inventory":
            return t("console.inventoryDescription")
        case "finance":
            return t("console.financeDescription")
        case "pos":
            return t("console.posDescription")
        default:
            return t("console.defaultDescription", { module: m.label.toLowerCase() })
    }
}
