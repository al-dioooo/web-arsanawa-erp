"use client";

import Link from "next/link";
import { StatusPill } from "@/components/ui/status-pill";
import { useSession } from "@/features/auth/session-provider";
import { titleCase } from "@/lib/format";

export function DashboardView() {
    const { modules, companies, activeCompanyId, profile, organizationContext } = useSession();
    const activeCompany = companies.find((entry) => entry.company.id === activeCompanyId);
    const enabledModules = modules?.enabled ?? [];
    const availableModules = modules?.available ?? [];

    return (
        <div className="grid gap-6">
            <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
                <div className="rounded-2xl border border-navy-100 bg-white p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
                                Module dashboard
                            </p>
                            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-navy-950">
                                {activeCompany?.company.name ?? "Create a company to begin"}
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-navy-600">
                                Enabled modules are scoped to the selected company and filtered by your
                                permissions.
                            </p>
                        </div>
                        <Link
                            href="/organization/companies"
                            className="inline-flex min-h-10 items-center justify-center rounded-md border border-navy-200 bg-white px-4 text-sm font-medium text-navy-900 transition hover:border-navy-300 hover:bg-navy-50"
                        >
                            Organization settings
                        </Link>
                    </div>
                </div>

                <div className="rounded-2xl border border-navy-100 bg-white p-5">
                    <p className="text-sm font-semibold text-navy-950">Signed in as</p>
                    <p className="mt-2 text-lg font-semibold text-navy-950">{profile?.name}</p>
                    <p className="text-sm text-navy-600">{profile?.email}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <StatusPill tone="green">{profile?.status.status ?? "active"}</StatusPill>
                        <StatusPill tone="neutral">{organizationContext?.membership?.role ?? "no role"}</StatusPill>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-navy-100 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-navy-950">Enabled modules</h2>
                    <StatusPill tone={enabledModules.length ? "green" : "amber"}>
                        {enabledModules.length} enabled
                    </StatusPill>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {enabledModules.length ? (
                        enabledModules.map((module) => (
                            <article
                                key={module}
                                className="rounded-2xl border border-navy-100 bg-navy-50 p-4 transition hover:border-teal-300 hover:bg-teal-50/50"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-base font-semibold text-navy-950">{titleCase(module)}</h3>
                                    <StatusPill tone="green">Enabled</StatusPill>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-navy-600">
                                    Module route can be connected once the frontend module app exists.
                                </p>
                            </article>
                        ))
                    ) : (
                        <div className="rounded-2xl border border-dashed border-navy-200 bg-navy-50 p-6 text-sm text-navy-600 md:col-span-2 xl:col-span-3">
                            No enabled modules are visible for this company yet.
                        </div>
                    )}
                </div>
            </section>

            <section className="rounded-2xl border border-navy-100 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-navy-950">Available modules</h2>
                    <StatusPill tone="neutral">{availableModules.length} available</StatusPill>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {availableModules.length ? (
                        availableModules.map((module) => (
                            <article key={module} className="rounded-2xl border border-navy-100 bg-white p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-base font-semibold text-navy-950">{titleCase(module)}</h3>
                                    <StatusPill tone="amber">Available</StatusPill>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-navy-600">
                                    Entitled but not enabled for daily use.
                                </p>
                            </article>
                        ))
                    ) : (
                        <div className="rounded-2xl border border-dashed border-navy-200 bg-navy-50 p-6 text-sm text-navy-600 md:col-span-2 xl:col-span-3">
                            No available modules are visible for your role.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
