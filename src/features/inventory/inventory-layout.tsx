import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Icon } from "@/components/ui/icon"
import { PageHeader } from "@/components/ui/page-header"
import { StatusPill } from "@/components/ui/status-pill"

type InventoryPageHeaderProps = {
    title: string
    description: string
    eyebrow?: string
    icon?: string
    isCompanyScoped?: boolean
    status?: ReactNode
    actions?: ReactNode
}

export function InventoryPageHeader({
    title,
    description,
    eyebrow = "Inventory",
    icon,
    isCompanyScoped,
    status,
    actions,
}: InventoryPageHeaderProps) {
    const t = useTranslations()
    const resolvedStatus = status ?? (typeof isCompanyScoped === "boolean" ? (
        <StatusPill tone={isCompanyScoped ? "green" : "amber"}>
            {isCompanyScoped ? t("common.companyScoped") : t("common.noCompany")}
        </StatusPill>
    ) : null)

    return (
        <PageHeader
            dataAttribute="data-inventory-page-header"
            eyebrow={(
                <>
                    {icon ? <Icon name={icon} size={16} /> : null}
                    <span>{eyebrow}</span>
                </>
            )}
            title={title}
            subtitle={description}
            status={resolvedStatus}
            actions={actions}
        />
    )
}
