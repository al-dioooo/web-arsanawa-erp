"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { StatusPill } from "@/components/ui/status-pill"
import { formatCurrency } from "@/lib/money"
import type { Register, Shift } from "@/features/pos/pos-types"

type ShiftBarProps = {
    shift: Shift | null
    registers: Register[]
    onOpenShift: () => void
    onCloseShift: () => void
}

export function ShiftBar({ shift, registers, onOpenShift, onCloseShift }: ShiftBarProps) {
    const t = useTranslations("pos.register.shiftBar")
    const register = shift ? registers.find((r) => r.id === shift.register_id) : null

    if (!shift || shift.status !== "open") {
        return (
            <section className="flex flex-col gap-3 rounded-lg bg-warning-soft p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Icon name="warning" className="text-warning-strong" />
                    <div>
                        <p className="text-sm font-bold text-warning-strong font-display">{t("noOpenShift")}</p>
                        <p className="text-xs text-warning-strong font-body">
                            {t("openPrompt")}
                        </p>
                    </div>
                </div>
                <Button type="button" size="xl" onClick={onOpenShift}>
                    <Icon name="add" size={18} />
                    {t("openShift")}
                </Button>
            </section>
        )
    }

    return (
        <section className="flex flex-col gap-4 rounded-lg bg-surface p-5 shadow-card lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex items-center gap-2">
                    <Icon name="point_of_sale" className="text-brand-ink" />
                    <span className="text-sm font-bold text-ink font-display">
                        {register?.name ?? t("registerRef", { id: shift.register_id })}
                    </span>
                    <StatusPill tone="green">{t("open")}</StatusPill>
                </div>
                <div className="text-xs text-ink-muted font-body">
                    <span className="font-semibold text-ink-secondary">{t("openingFloat")}</span>{" "}
                    {formatCurrency(shift.opening_float)}
                </div>
                <div className="text-xs text-ink-muted font-body">
                    <span className="font-semibold text-ink-secondary">{t("expectedCash")}</span>{" "}
                    {formatCurrency(shift.expected_cash ?? shift.opening_float)}
                </div>
            </div>
            <Button type="button" variant="outline" size="xl" onClick={onCloseShift}>
                <Icon name="logout" size={18} />
                {t("closeShift")}
            </Button>
        </section>
    )
}
