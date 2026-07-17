"use client"

import { useTranslations } from "next-intl"
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
    const t = useTranslations("pos.register.selector")
    const activeRegisters = registers.filter(
        (register) => register.is_active && (!branchId || register.branch_id === branchId),
    )

    return (
        <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
            <SearchableSelect
                label={t("register")}
                value={value ?? ""}
                onChange={(next) => onChange(next ? Number(next) : null)}
                options={activeRegisters.map((register) => ({
                    value: register.id,
                    label: `${register.name} (${register.code})`,
                }))}
                placeholder={activeRegisters.length > 0 ? t("selectActive") : t("noActive")}
            />
            {activeRegisters.length === 0 ? (
                <p className="mt-1 text-xs font-medium text-warning-strong">
                    {t("createPrompt")}
                </p>
            ) : null}
        </div>
    )
}
