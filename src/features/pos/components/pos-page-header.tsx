"use client"

import { useEffect, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { StatusPill } from "@/components/ui/status-pill"
import { PageHeaderShell } from "@/components/ui/page-header-shell"

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
        <PageHeaderShell eyebrow="Point of Sale" title={title} subtitle={subtitle}>
            <div className="flex flex-wrap items-center gap-2">
                {actions}
                <StatusPill tone={hasCompany ? "green" : "amber"}>
                    {hasCompany ? t("common.companyScoped") : t("common.noCompany")}
                </StatusPill>
            </div>
        </PageHeaderShell>
    )
}
