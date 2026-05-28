"use client"

import { Icon } from "@/components/ui/icon"

type PosSetupChecklistProps = {
    hasBranch: boolean
    hasRegister: boolean
    hasOpenShift: boolean
}

export function PosSetupChecklist({ hasBranch, hasRegister, hasOpenShift }: PosSetupChecklistProps) {
    const items = [
        { label: "Branch selected", done: hasBranch },
        { label: "Active register selected", done: hasRegister },
        { label: "Shift open for selected register", done: hasOpenShift },
    ]

    if (items.every((item) => item.done)) return null

    return (
        <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 text-sm">
            <p className="mb-2 font-bold text-orange-900">Register setup required</p>
            <div className="grid gap-1.5">
                {items.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 font-medium text-orange-900">
                        <Icon name={item.done ? "check" : "radio_button_unchecked"} size={16} />
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
