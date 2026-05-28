"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/features/finance/components/page-header"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { useSession } from "@/features/auth/session-provider"
import {
    useTaxReturn,
    useFinalizeTaxReturn,
    useDeleteTaxReturn,
} from "@/features/finance/api-tax-returns"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { formatIDR, formatDateID } from "@/lib/format"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"

const TAX_TYPE_LABEL: Record<string, string> = {
    ppn: 'PPN (Value Added Tax)',
    pph23: 'PPh 23 (Withholding Tax)',
}

const SOURCE_TYPE_LABEL: Record<string, { label: string; color: string }> = {
    invoice: { label: 'Invoice', color: 'bg-teal-50 text-teal-700' },
    bill: { label: 'Bill', color: 'bg-orange-50 text-orange-700' },
}

export default function TaxReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    useSession()
    const { data: taxReturn, isLoading } = useTaxReturn(id)
    const finalize = useFinalizeTaxReturn()
    const deleteTaxReturn = useDeleteTaxReturn()
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const handleFinalize = () => {
        if (!taxReturn) return
        finalize.mutate(taxReturn.id, {
            onSuccess: () => {
                toast.success("Tax return finalized and journal entry posted")
            },
            onError: (err: Error) => {
                toast.error(err?.message || "Failed to finalize tax return")
            },
        })
    }

    const handleDelete = () => {
        if (!taxReturn) return
        deleteTaxReturn.mutate(taxReturn.id, {
            onSuccess: () => {
                toast.success("Tax return deleted")
                router.push('/finance/tax-returns')
            },
            onError: (err: Error) => {
                toast.error(err?.message || "Failed to delete tax return")
            },
        })
    }

    if (isLoading) {
        return (
            <div className="w-full flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3 text-navy-400">
                    <Icon name="hourglass_empty" className="text-4xl animate-spin" />
                    <p className="font-medium">Loading tax return...</p>
                </div>
            </div>
        )
    }

    if (!taxReturn) {
        return (
            <div className="w-full flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3 text-navy-400">
                    <Icon name="error_outline" className="text-4xl" />
                    <p className="font-medium">Tax return not found</p>
                    <Button variant="secondary" onClick={() => router.push('/finance/tax-returns')}>Back to Tax Returns</Button>
                </div>
            </div>
        )
    }

    const output = parseFloat(taxReturn.total_output)
    const input = parseFloat(taxReturn.total_input)
    const payable = parseFloat(taxReturn.total_payable)
    const isDraft = taxReturn.status === 'draft'
    const lines = taxReturn.lines || []

    return (
        <div className="w-full max-w-5xl">
            <PageHeader
                title={`SPT — ${TAX_TYPE_LABEL[taxReturn.tax_type] || taxReturn.tax_type}`}
                primaryAction={isDraft ? {
                    label: finalize.isPending ? "Finalizing..." : "Finalize & Post",
                    onClick: handleFinalize,
                    disabled: finalize.isPending,
                } : undefined}
                secondaryAction={isDraft ? {
                    label: "Delete",
                    onClick: () => setShowDeleteConfirm(true),
                } : undefined}
            />

            {/* Period + Status header */}
            <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-6 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="text-sm font-semibold text-navy-400 uppercase tracking-wider mb-1">Reporting Period</div>
                        <div className="text-2xl font-bold text-navy-900">
                            {formatDateID(taxReturn.period_start)} — {formatDateID(taxReturn.period_end)}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={cn(
                            "inline-flex px-3 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider",
                            taxReturn.tax_type === 'ppn'
                                ? "bg-teal-50 text-teal-700"
                                : "bg-indigo-50 text-indigo-700"
                        )}>
                            {taxReturn.tax_type === 'ppn' ? 'PPN' : 'PPh 23'}
                        </span>
                        <StatusBadge status={taxReturn.status} />
                    </div>
                </div>

                {taxReturn.journal_entry_id && (
                    <div className="mt-4 pt-4 border-t border-navy-100 flex items-center gap-2">
                        <Icon name="menu_book" className="text-navy-400" />
                        <span className="text-sm text-navy-500">Finalized in journal entry</span>
                        <Link
                            href={`/finance/journals/${taxReturn.journal_entry_id}`}
                            className="text-sm font-semibold text-teal-600 hover:text-teal-700 underline decoration-dotted"
                        >
                            JE-{taxReturn.journal_entry_id}
                        </Link>
                    </div>
                )}

                {isDraft && (
                    <div className="mt-4 pt-4 border-t border-navy-100 flex items-start gap-2 text-amber-700 bg-amber-50 rounded-xl px-4 py-3">
                        <Icon name="pending" className="text-base mt-0.5 flex-shrink-0" />
                        <p className="text-sm font-medium">
                            This return is in draft. Review the lines below, then click <strong>Finalize &amp; Post</strong> to generate the settlement journal entry and lock the return.
                        </p>
                    </div>
                )}
            </div>

            {/* KPI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
                    <div className="text-xs font-semibold text-navy-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                        Total Output Tax
                    </div>
                    <div className="text-2xl font-bold text-navy-900">{formatIDR(output)}</div>
                    <div className="text-sm text-navy-400 mt-1">Tax collected from customers</div>
                </div>
                <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
                    <div className="text-xs font-semibold text-navy-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                        Total Input Tax
                    </div>
                    <div className="text-2xl font-bold text-navy-900">{formatIDR(input)}</div>
                    <div className="text-sm text-navy-400 mt-1">Tax paid to vendors (creditable)</div>
                </div>
                <div className={cn(
                    "rounded-2xl border shadow-sm p-5",
                    payable > 0
                        ? "bg-rose-50 border-rose-200"
                        : "bg-teal-50 border-teal-200"
                )}>
                    <div className={cn(
                        "text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5",
                        payable > 0 ? "text-rose-500" : "text-teal-600"
                    )}>
                        <div className={cn("w-2 h-2 rounded-full", payable > 0 ? "bg-rose-500" : "bg-teal-500")}></div>
                        Net Tax Payable
                    </div>
                    <div className={cn("text-3xl font-bold", payable > 0 ? "text-rose-700" : "text-teal-700")}>
                        {formatIDR(payable)}
                    </div>
                    <div className={cn("text-sm mt-1", payable > 0 ? "text-rose-500" : "text-teal-500")}>
                        {payable > 0 ? "Amount to remit to tax authority" : "Net credit position"}
                    </div>
                </div>
            </div>

            {/* Transaction Lines */}
            <div className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-navy-100 flex items-center gap-2">
                    <Icon name="receipt_long" className="text-navy-500" />
                    <h2 className="font-bold text-navy-900">Transaction Lines</h2>
                    <span className="ml-auto text-xs text-navy-400 bg-navy-50 px-2 py-1 rounded-full font-medium">
                        {lines.length} transaction{lines.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {lines.length === 0 ? (
                    <div className="px-6 py-12 text-center text-navy-500">
                        <Icon name="receipt_long" className="text-4xl text-navy-200 mb-2" />
                        <p className="font-medium">No transactions found in this period.</p>
                        <p className="text-sm text-navy-400 mt-1">Ensure you have posted invoices or bills within the reporting period.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px] text-left border-collapse">
                            <thead>
                                <tr className="border-b border-navy-100 text-xs text-navy-500 uppercase tracking-wider">
                                    <th className="px-6 py-3 font-semibold">Source Type</th>
                                    <th className="px-6 py-3 font-semibold">Document ID</th>
                                    <th className="px-6 py-3 font-semibold text-right">Tax Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((line) => {
                                    const sourceInfo = SOURCE_TYPE_LABEL[line.source_type] || { label: line.source_type, color: 'bg-navy-50 text-navy-700' }
                                    const taxAmt = parseFloat(line.tax_amount)
                                    return (
                                        <tr key={line.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/30">
                                            <td className="px-6 py-4">
                                                <span className={cn("inline-flex px-2.5 py-1 rounded-full text-xs font-bold capitalize", sourceInfo.color)}>
                                                    {sourceInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-navy-700 font-mono text-sm">
                                                #{line.source_id}
                                            </td>
                                            <td className={cn(
                                                "px-6 py-4 text-right font-semibold",
                                                line.source_type === 'invoice' ? "text-orange-600" : "text-teal-600"
                                            )}>
                                                {formatIDR(taxAmt)}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot className="bg-navy-50/60">
                                <tr>
                                    <td colSpan={2} className="px-6 py-4 font-bold text-navy-900 uppercase text-xs tracking-wider">Total</td>
                                    <td className="px-6 py-4 font-bold text-navy-900 text-right text-base">
                                        {formatIDR(lines.reduce((s, l) => s + parseFloat(l.tax_amount), 0))}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete confirmation dialog */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-rose-50 rounded-xl">
                                <Icon name="delete_forever" className="text-rose-600 text-2xl" />
                            </div>
                            <div>
                                <h3 className="font-bold text-navy-900">Delete Tax Return?</h3>
                                <p className="text-sm text-navy-500">This action cannot be undone.</p>
                            </div>
                        </div>
                        <p className="text-sm text-navy-600 mb-6">
                            Are you sure you want to delete this draft tax return? All generated lines will be removed.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteTaxReturn.isPending}
                                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                {deleteTaxReturn.isPending ? "Deleting..." : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
