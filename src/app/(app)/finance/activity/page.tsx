"use client"

import { useSession } from "@/features/auth/session-provider"
import { useInvoices } from "@/features/finance/api-invoices"
import { useBills } from "@/features/finance/api-bills"
import { usePayments } from "@/features/finance/api-payments"
import { useJournalEntries } from "@/features/finance/api-journals"
import { PageHeader } from "@/features/finance/components/page-header"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { formatIDR, formatDateID } from "@/lib/format"
import { Icon } from "@/components/ui/icon"
import Link from "next/link"

type ActivityItem = {
    id: number
    type: "invoice" | "bill" | "payment" | "journal"
    title: string
    reference: string
    date: string
    description: string
    amount: number
    status: string
    link: string
    icon: string
    color: string
    bgColor: string
}

export default function ActivityFeedPage() {
    const { activeCompanyId } = useSession()

    // Fetch all transaction streams
    const { data: invoices = [], isLoading: loadingInvoices } = useInvoices(activeCompanyId)
    const { data: bills = [], isLoading: loadingBills } = useBills(activeCompanyId)
    const { data: payments = [], isLoading: loadingPayments } = usePayments(activeCompanyId)
    const { data: journals = [], isLoading: loadingJournals } = useJournalEntries(activeCompanyId)

    const isLoading = loadingInvoices || loadingBills || loadingPayments || loadingJournals

    // Transform and aggregate into a unified stream
    const activities: ActivityItem[] = []

    invoices.forEach(inv => {
        activities.push({
            id: inv.id,
            type: "invoice",
            title: "Faktur Penjualan (Invoice)",
            reference: inv.invoice_number,
            date: inv.invoice_date,
            description: `Pelanggan: ${inv.partner?.name || `Partner #${inv.partner_id}`}`,
            amount: parseFloat(inv.total),
            status: inv.status,
            link: `/finance/invoices/${inv.id}`,
            icon: "request_quote",
            color: "text-teal-600",
            bgColor: "bg-teal-50"
        })
    })

    bills.forEach(bill => {
        activities.push({
            id: bill.id,
            type: "bill",
            title: "Tagihan Pembelian (Vendor Bill)",
            reference: bill.bill_number,
            date: bill.bill_date,
            description: `Pemasok: ${bill.partner?.name || `Partner #${bill.partner_id}`}`,
            amount: parseFloat(bill.total),
            status: bill.status,
            link: `/finance/bills/${bill.id}`,
            icon: "receipt",
            color: "text-orange-600",
            bgColor: "bg-orange-50"
        })
    })

    payments.forEach(pay => {
        const isDisbursement = pay.payment_type === "outgoing"
        activities.push({
            id: pay.id,
            type: "payment",
            title: isDisbursement ? "Pembayaran Keluar (Payment)" : "Penerimaan Masuk (Receipt)",
            reference: pay.payment_number,
            date: pay.payment_date,
            description: `${isDisbursement ? "Kepada: " : "Dari: "} ${pay.partner?.name || `Partner #${pay.partner_id}`}`,
            amount: parseFloat(pay.amount),
            status: pay.status,
            link: isDisbursement ? `/finance/payments/${pay.id}` : `/finance/receipts/${pay.id}`,
            icon: isDisbursement ? "account_balance_wallet" : "savings",
            color: isDisbursement ? "text-indigo-600" : "text-emerald-600",
            bgColor: isDisbursement ? "bg-indigo-50" : "bg-emerald-50"
        })
    })

    journals.forEach(entry => {
        const debitSum = entry.lines?.reduce((sum, line) => sum + (line.debit || 0), 0) || 0
        activities.push({
            id: entry.id,
            type: "journal",
            title: "Jurnal Umum (Journal Entry)",
            reference: entry.entry_number || `JE-${entry.id}`,
            date: entry.entry_date,
            description: entry.description || "Manual adjustment",
            amount: debitSum,
            status: entry.status,
            link: `/finance/journals/${entry.id}`,
            icon: "menu_book",
            color: "text-amber-600",
            bgColor: "bg-amber-50"
        })
    })

    // Sort chronologically (newest first)
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return (
        <div className="w-full max-w-4xl mx-auto">
            <PageHeader
                title="Riwayat Aktivitas Keuangan"
                subtitle="Aliran kronologis transaksi, faktur, tagihan, dan jurnal umum."
            />

            {isLoading && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-100 border-t-teal-600 mb-4" />
                    <p className="text-navy-500 font-medium">Aggregating transactions log...</p>
                </div>
            )}

            {!isLoading && activities.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-12 text-center flex flex-col items-center justify-center">
                    <div className="p-4 rounded-full bg-navy-50 text-navy-400 mb-4">
                        <Icon name="history" className="text-4xl" />
                    </div>
                    <h3 className="text-lg font-bold text-navy-900 mb-1">Belum Ada Riwayat</h3>
                    <p className="text-navy-500 text-sm max-w-md">
                        Semua transaksi keuangan, pembayaran, faktur, dan jurnal umum yang dicatat akan muncul di sini secara kronologis.
                    </p>
                </div>
            )}

            {!isLoading && activities.length > 0 && (
                <div className="flex flex-col gap-4">
                    {activities.map((item, index) => (
                        <div 
                            key={`${item.type}-${item.id}-${index}`} 
                            className="bg-white rounded-2xl p-5 shadow-sm border border-navy-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-teal-200 hover:shadow transition-all group"
                        >
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl shrink-0 ${item.bgColor}`}>
                                    <Icon name={item.icon} className={`text-xl ${item.color}`} />
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="font-semibold text-xs text-navy-450 uppercase tracking-wider">{item.title}</span>
                                        <span className="text-navy-300">•</span>
                                        <span className="text-xs font-semibold text-navy-500">{formatDateID(item.date)}</span>
                                    </div>
                                    <Link 
                                        href={item.link} 
                                        className="font-bold text-navy-900 group-hover:text-teal-600 transition-colors text-base hover:underline block"
                                    >
                                        {item.reference}
                                    </Link>
                                    <p className="text-sm text-navy-500 mt-0.5">{item.description}</p>
                                </div>
                            </div>
                            
                            <div className="flex sm:flex-col items-end justify-between sm:justify-center w-full sm:w-auto border-t sm:border-t-0 border-navy-50 pt-3 sm:pt-0 gap-2 shrink-0">
                                <span className="font-bold text-navy-900 text-lg">
                                    {formatIDR(item.amount)}
                                </span>
                                <StatusBadge status={item.status} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
