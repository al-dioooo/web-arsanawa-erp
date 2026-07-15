import type { ReactNode } from "react"
import { Icon } from "@/components/ui/icon"
import { StatusPill } from "@/components/ui/status-pill"
import { PageHeaderShell } from "@/components/ui/page-header-shell"

type InventoryPageHeaderProps = {
    title: string
    description: string
    eyebrow?: string
    icon?: string
    isCompanyScoped?: boolean
    status?: ReactNode
    actions?: ReactNode
}

export const inventorySurfaceClass = "rounded-2xl border border-navy-100 bg-white"

export const inventoryPrimaryActionLinkClass =
    "inline-flex h-11 items-center justify-center rounded-md bg-teal-700 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800"

export function InventoryPageHeader({
    title,
    description,
    eyebrow = "Inventory",
    icon,
    isCompanyScoped,
    status,
    actions,
}: InventoryPageHeaderProps) {
    const resolvedStatus = status ?? (typeof isCompanyScoped === "boolean" ? (
        <StatusPill tone={isCompanyScoped ? "green" : "amber"}>
            {isCompanyScoped ? "Company scoped" : "No company"}
        </StatusPill>
    ) : null)

    return (
        <PageHeaderShell
            dataAttribute="data-inventory-page-header"
            eyebrow={(
                <>
                    {icon ? <Icon name={icon} size={16} /> : null}
                    <span>{eyebrow}</span>
                </>
            )}
            title={title}
            subtitle={description}
        >
            <div className="flex flex-col justify-between gap-2">
                <div className="lg:self-end">
                    {resolvedStatus}
                </div>
                <div className="flex items-center gap-2">
                    {actions}
                </div>
            </div>
        </PageHeaderShell>
    )
}
