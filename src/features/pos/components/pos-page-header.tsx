"use client"

import { useEffect, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { StatusPill } from "@/components/ui/status-pill"

type PosPageHeaderProps = {
    title: string
    subtitle?: string
    hasCompany: boolean
    isLoading: boolean
    message?: string | null
    error?: string | null
    actions?: ReactNode
}

export function PosPageHeader({
    title,
    subtitle,
    hasCompany,
    message,
    error,
    actions,
}: PosPageHeaderProps) {
    const t = useTranslations()

    useEffect(() => {
        if (message) toast.success(message)
    }, [message])

    useEffect(() => {
        if (error) toast.error(error)
    }, [error])

    return (
        <section className="rounded-2xl border border-navy-100 bg-white p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-teal-700 font-display">
                        Point of Sale
                    </p>
                    <h1 className="mt-2 text-2xl font-brand font-bold text-navy-900">{title}</h1>
                    {subtitle ? (
                        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-navy-500 font-body">
                            {subtitle}
                        </p>
                    ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {actions}
                    <StatusPill tone={hasCompany ? "green" : "amber"}>
                        {hasCompany ? t("common.companyScoped") : t("common.noCompany")}
                    </StatusPill>
                </div>
            </div>
        </section>
    )
}
