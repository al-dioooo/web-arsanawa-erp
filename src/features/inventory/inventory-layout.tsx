import type { ReactNode } from "react"
import { Icon } from "@/components/ui/icon"
import { StatusPill } from "@/components/ui/status-pill"
import { cn } from "@/lib/utils"

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
        <section data-inventory-page-header className={cn(inventorySurfaceClass, "p-6")}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700 font-display">
                        {icon ? <Icon name={icon} size={16} /> : null}
                        <span>{eyebrow}</span>
                    </p>
                    <h1 className="mt-2 text-2xl font-brand font-bold text-navy-900">
                        {title}
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-navy-500 font-body">
                        {description}
                    </p>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                    {resolvedStatus}
                    {actions}
                </div>
            </div>
        </section>
    )
}
