"use client"

import { DatePicker } from "@/components/ui/date-picker"
import { SelectField } from "@/components/ui/field"
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
    return (
        <div className="mb-4 grid gap-3 border-b border-navy-50 pb-4 md:grid-cols-5">
            <SelectField label="Status" value={filters.status} onChange={(event) => onChange({ status: event.target.value })}>
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="void">Void</option>
            </SelectField>
            <SelectField label="Type" value={filters.type} onChange={(event) => onChange({ type: event.target.value })}>
                <option value="">All types</option>
                <option value="counter">Counter</option>
                <option value="catering">Catering</option>
            </SelectField>
            <SelectField
                label="Branch"
                value={filters.branchId}
                onChange={(event) => onChange({ branchId: event.target.value })}
            >
                <option value="">All branches</option>
                {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                        {branch.name}
                    </option>
                ))}
            </SelectField>
            <DatePicker
                label="Fulfilment from"
                value={filters.fulfilmentFrom}
                onChange={(value) => onChange({ fulfilmentFrom: value })}
            />
            <DatePicker
                label="Fulfilment to"
                value={filters.fulfilmentTo}
                onChange={(value) => onChange({ fulfilmentTo: value })}
            />
        </div>
    )
}
