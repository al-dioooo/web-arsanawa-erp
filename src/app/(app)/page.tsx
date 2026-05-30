"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { useSession } from "@/features/auth/session-provider"
import { moduleRegistry, type ModuleEntry } from "@/lib/modules/registry"
import { buildConsoleTiles, type ConsoleTile } from "@/lib/console/tiles"
import { Icon } from "@/components/ui/icon"
import { StatusPill } from "@/components/ui/status-pill"

/**
 * The Console — the launcher view shown at `/`. It surfaces:
 *
 * - The **Organization** app (always available — never a module, can't be
 *   uninstalled).
 * - The **Module Manager** app (company-admin only).
 * - Every **enabled** module app for the active company.
 *
 * Each tile takes the user into a workspace. The home page itself has no
 * sidebar — the shell switches into module-mode the moment the user enters
 * a module workspace.
 */
export default function ConsolePage() {
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
            <section className="relative rounded-2xl border border-navy-100 bg-white p-8 overflow-hidden">
                <p className="text-xs font-bold uppercase tracking-wider text-teal-700 font-display">
                    {t("console.eyebrow")}
                </p>
                <h1 className="mt-2 text-3xl font-brand font-bold text-navy-900">
                    {t("console.welcome", { name: user?.name ?? "" })}
                </h1>
                {activeCompany ? (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-500 font-body">
                        {t("console.managing", { company: activeCompany.name })}
                    </p>
                ) : (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-500 font-body">
                        {t("console.selectOrganization")}
                    </p>
                )}
            </section>

            {activeCompany && (
                <section className="grid gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-navy-900 font-display">
                            {t("console.applications")}
                        </h2>
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
                        <div className="rounded-2xl border border-dashed border-navy-200 bg-navy-50/20 p-8 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 text-navy-500">
                                <Icon name="info" className="text-xl" />
                            </div>
                            <p className="text-sm font-bold text-navy-900 font-display">
                                {t("console.noApplications")}
                            </p>
                            <p className="mt-1 text-xs text-navy-500 font-body">
                                {canManageModules
                                    ? t("console.openModuleManagerHint")
                                    : t("console.askAdminHint")}
                            </p>
                            {canManageModules && (
                                <Link
                                    href="/organization/modules"
                                    className="mt-4 inline-flex min-h-9 items-center justify-center rounded-xl bg-teal-700 hover:bg-teal-900 px-4 text-xs font-bold text-white transition-colors cursor-pointer"
                                >
                                    {t("console.openModuleManager")}
                                </Link>
                            )}
                        </div>
                    )}

                    {canManageModules && installableModules.length > 0 && (
                        <div className="grid gap-3">
                            <p className="text-xs font-bold uppercase tracking-widest text-navy-400 font-display">
                                {t("console.availableToInstall")}
                            </p>
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

            <section className="grid gap-6">
                <h2 className="text-lg font-bold text-navy-900 font-display">{t("console.section")}</h2>
                <TileGrid tiles={consoleTiles} />
            </section>
        </div>
    )
}

type Tile = ConsoleTile & { dimmed?: boolean }

function TileGrid({ tiles }: { tiles: Tile[] }) {
    const t = useTranslations()

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tiles.map((tile) => (
                <article
                    key={tile.key}
                    className={`flex flex-col justify-between rounded-2xl border border-navy-100 bg-white p-6 transition-all duration-200 ${tile.dimmed ? "opacity-60" : "hover:-translate-y-0.5"}`}
                >
                    <div>
                        <div
                            className="flex h-12 w-12 items-center justify-center rounded-xl"
                            style={{
                                backgroundColor: `${tile.accentColor}15`,
                                color: tile.accentColor,
                            }}
                        >
                            <Icon name={tile.icon} className="text-2xl" />
                        </div>
                        <h3 className="mt-5 text-lg font-bold text-navy-900 leading-tight font-display">
                            {tile.label}
                        </h3>
                        {tile.description ? (
                            <p className="mt-2 text-xs leading-relaxed text-navy-500 font-body">
                                {tile.description}
                            </p>
                        ) : null}
                    </div>
                    <div className="mt-6 pt-5 border-t border-navy-50">
                        <Link
                            href={tile.route}
                            className="inline-flex w-full min-h-10 items-center justify-center rounded-xl text-xs font-bold text-white transition-all cursor-pointer hover:brightness-95"
                            style={{ backgroundColor: tile.accentColor }}
                        >
                            {tile.dimmed ? t("common.install") : t("common.open")}
                        </Link>
                    </div>
                </article>
            ))}
        </div>
    )
}

function defaultDescription(m: ModuleEntry, t: (key: string, values?: Record<string, string | number>) => string): string {
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
