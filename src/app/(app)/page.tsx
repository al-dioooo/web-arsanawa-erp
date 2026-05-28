"use client"

import Link from "next/link"
import { useSession } from "@/features/auth/session-provider"
import { canManageEntitlements } from "@/features/auth/access"
import { moduleRegistry, type ModuleEntry } from "@/lib/modules/registry"
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

    const activeCompany = companies.find((c) => c.company.id === activeCompanyId)?.company
    const canManageModules = canManageEntitlements(organizationContext?.membership)

    const enabledSet = new Set(modules?.enabled ?? [])
    const availableSet = new Set(modules?.available ?? [])

    const consoleTiles: Tile[] = [
        {
            key: "organization",
            label: "Organization",
            icon: "corporate_fare",
            accentColor: "#0b5c6a",
            route: "/organization/companies",
            description: "Companies, branches, members, and roles.",
        },
        {
            key: "profile",
            label: "Profile",
            icon: "manage_accounts",
            accentColor: "#137d90",
            route: "/profile",
            description: "Identity, locale, timezone, and user lookup.",
        },
        ...(activeCompany
            ? [
                  {
                      key: "partners",
                      label: "Partners",
                      icon: "groups",
                      accentColor: "#f47b50",
                      route: "/partners",
                      description: "Customers, suppliers, contacts, and addresses.",
                  } satisfies Tile,
                  {
                      key: "platform-settings",
                      label: "Platform Settings",
                      icon: "tune",
                      accentColor: "#6f7d90",
                      route: "/platform/settings",
                      description: "Currencies and company module settings.",
                  } satisfies Tile,
              ]
            : []),
        ...(canManageModules
            ? [
                  {
                      key: "module-manager",
                      label: "Module Manager",
                      icon: "settings_suggest",
                      accentColor: "#137d90",
                      route: "/organization/modules",
                      description: "Install or uninstall apps for this company.",
                  } satisfies Tile,
              ]
            : []),
    ]

    const enabledModules = moduleRegistry.filter((m) => enabledSet.has(m.key))
    const installableModules = moduleRegistry.filter(
        (m) => !enabledSet.has(m.key) && availableSet.has(m.key),
    )

    return (
        <div className="grid gap-8">
            <section className="relative rounded-2xl border border-navy-100 bg-white p-8 overflow-hidden">
                <p className="text-xs font-bold uppercase tracking-wider text-teal-700 font-display">
                    Console
                </p>
                <h1 className="mt-2 text-3xl font-brand font-bold text-navy-900">
                    Welcome back, {user?.name}
                </h1>
                {activeCompany ? (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-500 font-body">
                        Managing operations for{" "}
                        <strong className="text-navy-700 font-semibold">{activeCompany.name}</strong>.
                        Choose an app to begin.
                    </p>
                ) : (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-500 font-body">
                        Select an organization to activate your workspace.
                    </p>
                )}
            </section>

            <section className="grid gap-6">
                <h2 className="text-lg font-bold text-navy-900 font-display">Console</h2>
                <TileGrid tiles={consoleTiles} />
            </section>

            {activeCompany && (
                <section className="grid gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-navy-900 font-display">
                            Applications
                        </h2>
                        <StatusPill tone="green">
                            {enabledModules.length} active
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
                                description: defaultDescription(m),
                            }))}
                        />
                    ) : (
                        <div className="rounded-2xl border border-dashed border-navy-200 bg-navy-50/20 p-8 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 text-navy-500">
                                <Icon name="info" className="text-xl" />
                            </div>
                            <p className="text-sm font-bold text-navy-900 font-display">
                                No applications installed
                            </p>
                            <p className="mt-1 text-xs text-navy-500 font-body">
                                {canManageModules
                                    ? "Open the Module Manager to install apps for this company."
                                    : "Ask your administrator to install apps for this company."}
                            </p>
                            {canManageModules && (
                                <Link
                                    href="/organization/modules"
                                    className="mt-4 inline-flex min-h-9 items-center justify-center rounded-xl bg-teal-700 hover:bg-teal-900 px-4 text-xs font-bold text-white transition-colors cursor-pointer"
                                >
                                    Open Module Manager
                                </Link>
                            )}
                        </div>
                    )}

                    {canManageModules && installableModules.length > 0 && (
                        <div className="grid gap-3">
                            <p className="text-xs font-bold uppercase tracking-widest text-navy-400 font-display">
                                Available to install
                            </p>
                            <TileGrid
                                tiles={installableModules.map((m) => ({
                                    key: m.key,
                                    label: m.label,
                                    icon: m.icon,
                                    accentColor: m.accentColor,
                                    route: "/organization/modules",
                                    description: defaultDescription(m),
                                    dimmed: true,
                                }))}
                            />
                        </div>
                    )}
                </section>
            )}
        </div>
    )
}

type Tile = {
    key: string
    label: string
    icon: string
    accentColor: string
    route: string
    description: string
    dimmed?: boolean
}

function TileGrid({ tiles }: { tiles: Tile[] }) {
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
                        <p className="mt-2 text-xs leading-relaxed text-navy-500 font-body">
                            {tile.description}
                        </p>
                    </div>
                    <div className="mt-6 pt-5 border-t border-navy-50">
                        <Link
                            href={tile.route}
                            className="inline-flex w-full min-h-10 items-center justify-center rounded-xl text-xs font-bold text-white transition-all cursor-pointer hover:brightness-95"
                            style={{ backgroundColor: tile.accentColor }}
                        >
                            {tile.dimmed ? "Install" : "Open"}
                        </Link>
                    </div>
                </article>
            ))}
        </div>
    )
}

function defaultDescription(m: ModuleEntry): string {
    switch (m.key) {
        case "inventory":
            return "Products, stock, pricing, and promotions."
        case "finance":
            return "Ledger, AR/AP, payments, and tax."
        case "pos":
            return "Counter sales, catering orders, and shifts."
        default:
            return `Workspace for ${m.label.toLowerCase()}.`
    }
}
