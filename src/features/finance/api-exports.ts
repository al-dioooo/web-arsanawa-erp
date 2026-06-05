"use client"

import { apiDownload } from "@/lib/api-client"

export type ExportRange = {
    from?: string | null
    to?: string | null
}

function rangeQuery(range: ExportRange): string {
    const search = new URLSearchParams()
    if (range.from) search.set("from", range.from)
    if (range.to) search.set("to", range.to)
    const value = search.toString()
    return value ? `?${value}` : ""
}

function stamp(): string {
    return new Date().toISOString().slice(0, 10)
}

export function downloadIncomeExport(range: ExportRange = {}): Promise<void> {
    return apiDownload(
        `/api/v1/finance/exports/income.xlsx${rangeQuery(range)}`,
        `income-${stamp()}.xlsx`,
    )
}

export function downloadExpenseExport(range: ExportRange = {}): Promise<void> {
    return apiDownload(
        `/api/v1/finance/exports/expense.xlsx${rangeQuery(range)}`,
        `expense-${stamp()}.xlsx`,
    )
}
