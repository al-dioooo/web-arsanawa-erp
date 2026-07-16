"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { StatusPill } from "@/components/ui/status-pill"
import { PageHeaderShell } from "@/components/ui/page-header-shell"

type PosPageHeaderProps = {
    title: string
    subtitle?: string
    hasCompany: boolean
    isLoading: boolean
    actions?: ReactNode
}

export function PosPageHeader({
    title,
    subtitle,
    hasCompany,
    actions,
}: PosPageHeaderProps) {
    const t = useTranslations()

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
