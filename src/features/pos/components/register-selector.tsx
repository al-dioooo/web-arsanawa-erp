"use client"

import { SearchableSelect } from "@/components/ui/searchable-select"
import type { Register } from "@/features/pos/pos-types"

type RegisterSelectorProps = {
    registers: Register[]
    branchId: number | null
    value: number | null
    onChange: (registerId: number | null) => void
    disabled?: boolean
}

export function RegisterSelector({
    registers,
    branchId,
    value,
    onChange,
    disabled,
}: RegisterSelectorProps) {
    const activeRegisters = registers.filter(
        (register) => register.is_active && (!branchId || register.branch_id === branchId),
    )

    return (
        <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
            <SearchableSelect
                label="Register"
                value={value ?? ""}
                onChange={(next) => onChange(next ? Number(next) : null)}
                options={activeRegisters.map((register) => ({
                    value: register.id,
                    label: `${register.name} (${register.code})`,
                }))}
                placeholder={activeRegisters.length > 0 ? "Select active register" : "No active registers"}
            />
            {activeRegisters.length === 0 ? (
                <p className="mt-1 text-xs font-medium text-orange-700">
                    Create or activate a register in this branch before selling.
                </p>
            ) : null}
        </div>
    )
}
