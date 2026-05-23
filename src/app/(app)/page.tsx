"use client"

import Link from "next/link"
import { useSession } from "@/features/auth/session-provider"
import { moduleRegistry } from "@/lib/modules/registry"
import { Icon } from "@/components/ui/icon"
import { StatusPill } from "@/components/ui/status-pill"

export default function HomePage() {
    const { user, modules, activeCompanyId, companies, organizationContext } = useSession()

    const activeCompany = companies.find((c) => c.company.id === activeCompanyId)?.company
    const isAdmin = organizationContext?.membership?.role === "admin"

    const enabledSet = new Set(modules?.enabled ?? [])
    const availableSet = new Set(modules?.available ?? [])

    return (
        <div className="grid gap-8">
            {/* Welcome Banner */}
            <section className="relative rounded-2xl border border-navy-100 bg-white p-8 overflow-hidden">
                <div className="relative z-10">
                    <p className="text-xs font-bold uppercase tracking-wider text-teal-700 font-display">
                        Workspace Hub
                    </p>
                    <h1 className="mt-2 text-3xl font-brand font-bold text-navy-900">
                        Welcome back, {user?.name}
                    </h1>
                    {activeCompany ? (
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-500 font-body">
                            Managing operations for <strong className="text-navy-700 font-semibold">{activeCompany.name}</strong>. Select an entitled application below to begin.
                        </p>
                    ) : (
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-500 font-body">
                            Please select or create a company context in the topbar to activate your workspace console.
                        </p>
                    )}
                </div>
            </section>

            {/* Grid of Applications */}
            {activeCompany && (
                <section className="grid gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-navy-900 font-display">
                            Applications
                        </h2>
                        <StatusPill tone="green">
                            {modules?.enabled.length ?? 0} active modules
                        </StatusPill>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {moduleRegistry
                            .filter((m) => m.key !== "organization")
                            .map((m) => {
                                const isEnabled = enabledSet.has(m.key)
                                const isAvailable = availableSet.has(m.key)

                                if (!isEnabled && !isAvailable) return null

                                return (
                                    <article
                                        key={m.key}
                                        className={`flex flex-col justify-between rounded-2xl border bg-white p-6 transition-all duration-300 ${ isEnabled ? "border-navy-100 hover:-translate-y-1 hover:-hover" : "border-navy-100 opacity-60" }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-3">
                                                <div
                                                    className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-150"
                                                    style={{
                                                        backgroundColor: `${m.accentColor}15`,
                                                        color: m.accentColor
                                                    }}
                                                >
                                                    <Icon name={m.icon} className="text-2xl" />
                                                </div>
                                                {isEnabled ? (
                                                    <StatusPill tone="green">Active</StatusPill>
                                                ) : (
                                                    <StatusPill tone="neutral">Inactive</StatusPill>
                                                )}
                                            </div>

                                            <h3 className="mt-5 text-lg font-bold text-navy-900 leading-tight font-display">
                                                {m.label}
                                            </h3>
                                            <p className="mt-2 text-xs leading-relaxed text-navy-500 font-body">
                                                Full-scale workspace for managing company-level {m.label.toLowerCase()} logs, operations, and reporting structures.
                                            </p>
                                        </div>

                                        <div className="mt-6 pt-5 border-t border-navy-50">
                                            {isEnabled ? (
                                                <Link
                                                    href={m.route}
                                                    className="inline-flex w-full min-h-10 items-center justify-center rounded-xl text-xs font-bold text-white transition-all cursor-pointer hover:brightness-95"
                                                    style={{ backgroundColor: m.accentColor }}
                                                >
                                                    Launch Workspace
                                                </Link>
                                            ) : isAdmin ? (
                                                <Link
                                                    href="/organization/modules"
                                                    className="inline-flex w-full min-h-10 items-center justify-center rounded-xl border border-navy-200 bg-white hover:bg-navy-50 text-xs font-bold text-navy-700 transition-all cursor-pointer"
                                                >
                                                    Enable in Module Manager
                                                </Link>
                                            ) : (
                                                <span className="inline-flex w-full min-h-10 items-center justify-center rounded-xl bg-navy-50 text-xs font-bold text-navy-400 select-none">
                                                    Contact Admin to Enable
                                                </span>
                                            )}
                                        </div>
                                    </article>
                                )
                            })}
                    </div>

                    {modules?.enabled.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-navy-200 bg-navy-50/20 p-8 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 text-navy-500 mx-auto mb-4">
                                <Icon name="info" className="text-xl" />
                            </div>
                            <p className="text-sm font-bold text-navy-900 font-display">No Enabled Applications</p>
                            <p className="text-xs text-navy-500 font-body mt-1">There are no modules enabled for this company context yet.</p>
                            {isAdmin && (
                                <Link
                                    href="/organization/modules"
                                    className="mt-4 inline-flex min-h-9 items-center justify-center rounded-xl bg-teal-700 hover:bg-teal-900 px-4 text-xs font-bold text-white transition-colors cursor-pointer"
                                >
                                    Configure Modules
                                </Link>
                            )}
                        </div>
                    )}
                </section>
            )}
        </div>
    )
}
