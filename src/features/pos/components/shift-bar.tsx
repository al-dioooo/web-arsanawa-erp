"use client"

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
    const register = shift ? registers.find((r) => r.id === shift.register_id) : null

    if (!shift || shift.status !== "open") {
        return (
            <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Icon name="warning" className="text-amber-700" />
                    <div>
                        <p className="text-sm font-bold text-amber-900 font-display">No open shift</p>
                        <p className="text-xs text-amber-800 font-body">
                            Open a cashier shift before ringing up sales.
                        </p>
                    </div>
                </div>
                <Button
                    type="button"
                    size="xl"
                    onClick={onOpenShift}
                    className="bg-teal-700 hover:bg-teal-800 text-white"
                >
                    <Icon name="add" size={18} />
                    Open shift
                </Button>
            </section>
        )
    }

    return (
        <section className="flex flex-col gap-4 rounded-2xl border border-navy-100 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex items-center gap-2">
                    <Icon name="point_of_sale" className="text-teal-700" />
                    <span className="text-sm font-bold text-navy-900 font-display">
                        {register?.name ?? `Register #${shift.register_id}`}
                    </span>
                    <StatusPill tone="green">Open</StatusPill>
                </div>
                <div className="text-xs text-navy-500 font-body">
                    <span className="font-semibold text-navy-700">Opening float</span>{" "}
                    {formatCurrency(shift.opening_float)}
                </div>
                <div className="text-xs text-navy-500 font-body">
                    <span className="font-semibold text-navy-700">Expected cash</span>{" "}
                    {formatCurrency(shift.expected_cash ?? shift.opening_float)}
                </div>
            </div>
            <Button type="button" variant="outline" size="xl" onClick={onCloseShift}>
                <Icon name="logout" size={18} />
                Close shift
            </Button>
        </section>
    )
}
