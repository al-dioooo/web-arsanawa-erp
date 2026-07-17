"use client"

import { useTranslations } from "next-intl"
import { DatePicker } from "@/components/ui/date-picker"
import { SelectField } from "@/components/ui/field"
import { FilterBar } from "@/components/ui/filter-bar"
import type { Branch } from "@/lib/types"

export type PosSalesFilters = {
    status: string
    type: string
    branchId: string
    fulfilmentFrom: string
    fulfilmentTo: string
}

type PosFilterBarProps = {
    filters: PosSalesFilters
    branches: Branch[]
    onChange: (next: Partial<PosSalesFilters>) => void
}

export function PosFilterBar({ filters, branches, onChange }: PosFilterBarProps) {
    const t = useTranslations("pos.sales.filters")

    return (
        <FilterBar>
            <div className="grid w-full gap-3 md:grid-cols-5">
                <SelectField
                    label={t("status")}
                    value={filters.status}
                    onChange={(event) => onChange({ status: event.target.value })}
                >
                    <option value="">{t("allStatuses")}</option>
                    <option value="draft">{t("draft")}</option>
                    <option value="confirmed">{t("confirmed")}</option>
                    <option value="completed">{t("completed")}</option>
                    <option value="void">{t("void")}</option>
                </SelectField>
                <SelectField
                    label={t("type")}
                    value={filters.type}
                    onChange={(event) => onChange({ type: event.target.value })}
                >
                    <option value="">{t("allTypes")}</option>
                    <option value="counter">{t("counter")}</option>
                    <option value="catering">{t("catering")}</option>
                </SelectField>
                <SelectField
                    label={t("branch")}
                    value={filters.branchId}
                    onChange={(event) => onChange({ branchId: event.target.value })}
                >
                    <option value="">{t("allBranches")}</option>
                    {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                            {branch.name}
                        </option>
                    ))}
                </SelectField>
                <DatePicker
                    label={t("fulfilmentFrom")}
                    value={filters.fulfilmentFrom}
                    onChange={(value) => onChange({ fulfilmentFrom: value })}
                />
                <DatePicker
                    label={t("fulfilmentTo")}
                    value={filters.fulfilmentTo}
                    onChange={(value) => onChange({ fulfilmentTo: value })}
                />
            </div>
        </FilterBar>
    )
}
