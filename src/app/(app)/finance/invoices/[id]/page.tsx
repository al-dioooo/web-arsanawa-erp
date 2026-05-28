"use client"

import { use } from "react"
import { PageHeader } from "@/features/finance/components/page-header"
import { useInvoice, usePostInvoice, useVoidInvoice } from "@/features/finance/api-invoices"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { formatIDR, formatDateID } from "@/lib/format"
import { toast } from "sonner"

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    
    const { data: invoice, isLoading } = useInvoice(id)
    const postInvoice = usePostInvoice()
    const voidInvoice = useVoidInvoice()

    if (isLoading) {
        return <div className="p-8 text-center text-navy-500">Loading invoice...</div>
    }

    if (!invoice) {
        return <div className="p-8 text-center text-rose-500">Invoice not found.</div>
    }

    const handlePost = () => {
        if (confirm("Are you sure you want to post this invoice? This action will generate a journal entry and cannot be easily undone.")) {
            postInvoice.mutate(invoice.id, {
                onSuccess: () => toast.success("Invoice posted successfully"),
                onError: (err: Error) => toast.error(err?.message || "Failed to post invoice")
            })
        }
    }

    const handleVoid = () => {
        if (confirm("Are you sure you want to void this invoice? This will cancel any pending receivables.")) {
            voidInvoice.mutate(invoice.id, {
                onSuccess: () => toast.success("Invoice voided successfully"),
                onError: (err: Error) => toast.error(err?.message || "Failed to void invoice")
            })
        }
    }

    return (
        <div className="w-full max-w-5xl">
            <PageHeader
                title={`Invoice ${invoice.invoice_number}`}
                primaryAction={invoice.status === 'draft' ? {
                    label: postInvoice.isPending ? "Posting..." : "Post Invoice",
                    onClick: handlePost,
                    disabled: postInvoice.isPending || voidInvoice.isPending
                } : undefined}
                secondaryAction={invoice.status === 'draft' || invoice.status === 'posted' ? {
                    label: voidInvoice.isPending ? "Voiding..." : "Void Invoice",
                    onClick: handleVoid,
                    disabled: postInvoice.isPending || voidInvoice.isPending
                } : undefined}
            />

            <div className="grid gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-navy-900 mb-1">{formatIDR(parseFloat(invoice.total))}</h2>
                        <div className="text-navy-500 text-sm">
                            Billed to <span className="font-semibold text-navy-700">{invoice.partner?.name || `Customer #${invoice.partner_id}`}</span>
                        </div>
                    </div>
                    <div className="flex gap-4 text-right">
                        <div>
                            <div className="text-xs text-navy-400 font-semibold uppercase tracking-wider mb-1">Status</div>
                            <StatusBadge status={invoice.status} />
                        </div>
                        <div>
                            <div className="text-xs text-navy-400 font-semibold uppercase tracking-wider mb-1">Invoice Date</div>
                            <div className="text-navy-900 font-medium">{formatDateID(invoice.invoice_date)}</div>
                        </div>
                        <div>
                            <div className="text-xs text-navy-400 font-semibold uppercase tracking-wider mb-1">Due Date</div>
                            <div className="text-navy-900 font-medium">{formatDateID(invoice.due_date)}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-navy-50/80 border-b border-navy-100 text-sm text-navy-500">
                                <th className="px-6 py-4 font-semibold">Description</th>
                                <th className="px-6 py-4 font-semibold text-right">Qty</th>
                                <th className="px-6 py-4 font-semibold text-right">Unit Price</th>
                                <th className="px-6 py-4 font-semibold text-right">Tax</th>
                                <th className="px-6 py-4 font-semibold text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.lines?.map((line, idx) => (
                                <tr key={idx} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/30 transition-colors">
                                    <td className="px-6 py-4 text-navy-900">{line.description}</td>
                                    <td className="px-6 py-4 text-navy-700 text-right">{parseFloat(line.quantity)}</td>
                                    <td className="px-6 py-4 text-navy-700 text-right">{formatIDR(parseFloat(line.unit_price))}</td>
                                    <td className="px-6 py-4 text-navy-700 text-right">{formatIDR(parseFloat(line.tax_amount))}</td>
                                    <td className="px-6 py-4 text-navy-900 font-semibold text-right">{formatIDR(parseFloat(line.line_total))}</td>
                                </tr>
                            ))}
                            {(!invoice.lines || invoice.lines.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-navy-400 italic">No line items found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6">
                        <h3 className="text-sm font-semibold text-navy-400 uppercase tracking-wider mb-3">Notes</h3>
                        <p className="text-navy-700 whitespace-pre-wrap">{invoice.notes || "No notes provided."}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6 flex flex-col gap-3">
                        <div className="flex justify-between text-navy-500 font-semibold">
                            <span>Subtotal</span>
                            <span>{formatIDR(parseFloat(invoice.subtotal))}</span>
                        </div>
                        <div className="flex justify-between text-navy-500 font-semibold">
                            <span>Tax Total</span>
                            <span>{formatIDR(parseFloat(invoice.tax_total))}</span>
                        </div>
                        <div className="border-t border-navy-100 my-1" />
                        <div className="flex justify-between text-navy-900 font-bold text-xl">
                            <span>Total</span>
                            <span>{formatIDR(parseFloat(invoice.total))}</span>
                        </div>
                        <div className="flex justify-between text-teal-600 font-semibold mt-2">
                            <span>Amount Paid</span>
                            <span>{formatIDR(parseFloat(invoice.amount_paid))}</span>
                        </div>
                        <div className="flex justify-between text-rose-600 font-semibold">
                            <span>Balance Due</span>
                            <span>{formatIDR(parseFloat(invoice.total) - parseFloat(invoice.amount_paid))}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
