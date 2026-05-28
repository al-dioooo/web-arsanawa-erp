"use client"

import { Icon } from "@/components/ui/icon"
import type { SaleType } from "@/features/pos/pos-types"

type SaleTypeToggleProps = {
    value: SaleType
    onChange: (value: SaleType) => void
    disabled?: boolean
}

const OPTIONS: { value: SaleType; label: string; icon: string }[] = [
    { value: "counter", label: "Counter", icon: "point_of_sale" },
    { value: "catering", label: "Catering", icon: "receipt_long" },
]

export function SaleTypeToggle({ value, onChange, disabled }: SaleTypeToggleProps) {
    return (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-navy-50 p-1">
            {OPTIONS.map((option) => {
                const active = option.value === value
                return (
                    <button
                        key={option.value}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(option.value)}
                        className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                            active
                                ? "bg-teal-700 text-white"
                                : "text-navy-600 hover:text-navy-900"
                        }`}
                    >
                        <Icon name={option.icon} size={18} />
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}
