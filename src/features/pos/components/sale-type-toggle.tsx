"use client"

import { useTranslations } from "next-intl"
import { Icon } from "@/components/ui/icon"
import type { SaleType } from "@/features/pos/pos-types"
import { cn } from "@/lib/utils"

type SaleTypeToggleProps = {
    value: SaleType
    onChange: (value: SaleType) => void
    disabled?: boolean
}

const OPTIONS: { value: SaleType; icon: string }[] = [
    { value: "counter", icon: "point_of_sale" },
    { value: "catering", icon: "receipt_long" },
]

export function SaleTypeToggle({ value, onChange, disabled }: SaleTypeToggleProps) {
    const t = useTranslations("pos.register.saleTypes")

    return (
        <div className="grid grid-cols-2 gap-1 rounded-md bg-surface-muted p-1">
            {OPTIONS.map((option) => {
                const active = option.value === value
                return (
                    <button
                        key={option.value}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold transition-colors outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                            active ? "bg-brand text-white" : "text-ink-secondary hover:text-ink",
                        )}
                    >
                        <Icon name={option.icon} size={18} />
                        {t(option.value)}
                    </button>
                )
            })}
        </div>
    )
}
