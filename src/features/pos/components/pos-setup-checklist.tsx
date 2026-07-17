"use client"

import { useTranslations } from "next-intl"
import { Icon } from "@/components/ui/icon"

type PosSetupChecklistProps = {
    hasBranch: boolean
    hasRegister: boolean
    hasOpenShift: boolean
}

export function PosSetupChecklist({ hasBranch, hasRegister, hasOpenShift }: PosSetupChecklistProps) {
    const t = useTranslations("pos.register.checklist")
    const items = [
        { key: "branch", label: t("branch"), done: hasBranch },
        { key: "register", label: t("register"), done: hasRegister },
        { key: "shift", label: t("shift"), done: hasOpenShift },
    ]

    if (items.every((item) => item.done)) return null

    return (
        <div className="rounded-md bg-warning-soft p-4 text-sm">
            <p className="mb-2 font-bold text-warning-strong">{t("title")}</p>
            <div className="grid gap-1.5">
                {items.map((item) => (
                    <div key={item.key} className="flex items-center gap-2 font-medium text-warning-strong">
                        <Icon name={item.done ? "check" : "radio_button_unchecked"} size={16} />
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
