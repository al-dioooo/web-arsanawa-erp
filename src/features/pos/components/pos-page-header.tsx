"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/ui/page-header"
import { StatusPill } from "@/components/ui/status-pill"

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
        <PageHeader
            eyebrow={t("modules.pos")}
            title={title}
            subtitle={subtitle}
            status={(
                <StatusPill tone={hasCompany ? "green" : "amber"}>
                    {hasCompany ? t("common.companyScoped") : t("common.noCompany")}
                </StatusPill>
            )}
            actions={actions}
        />
    )
}
