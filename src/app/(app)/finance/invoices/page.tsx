"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { useSession } from "@/features/auth/session-provider"
import { useInvoices } from "@/features/finance/api-invoices"
import { formatIDR, formatDateID } from "@/lib/format"
import { Icon } from "@/components/ui/icon"

export default function InvoicesPage() {
    const router = useRouter()
    const { activeCompanyId } = useSession()
    const { data: invoices = [], isLoading } = useInvoices(activeCompanyId)

    return (
        <div className="w-full">
            <PageHeader
                title="Sales Invoices"
                primaryAction={{
                    label: "+ New Invoice",
                    onClick: () => router.push("/finance/invoices/new")
                }}
            />

            <FilterBar>
                <div className="flex-1 text-sm text-navy-500">
                    Manage your accounts receivable invoices and their payment status.
                </div>
            </FilterBar>

            <DataTable columns={["Invoice Number", "Customer", "Date", "Due Date", "Total", "Status"]}>
                {isLoading && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-navy-500">
                            Loading invoices...
                        </td>
                    </tr>
                )}
                {!isLoading && invoices.length === 0 && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-navy-500">
                            No invoices found. Create one to get started.
                        </td>
                    </tr>
                )}
                {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-navy-50/50 transition-colors group">
                        <td className="px-6 py-4">
                            <Link href={`/finance/invoices/${invoice.id}`} className="font-semibold text-teal-700 hover:underline inline-flex items-center gap-1.5">
                                {invoice.invoice_number}
                                <Icon name="open_in_new" className="text-[12px] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                        </td>
                        <td className="px-6 py-4 font-semibold text-navy-900">
                            {invoice.partner?.name || `Customer #${invoice.partner_id}`}
                        </td>
                        <td className="px-6 py-4 text-navy-700">{formatDateID(invoice.invoice_date)}</td>
                        <td className="px-6 py-4 text-navy-700">{formatDateID(invoice.due_date)}</td>
                        <td className="px-6 py-4 text-navy-900 font-bold">{formatIDR(parseFloat(invoice.total))}</td>
                        <td className="px-6 py-4">
                            <StatusBadge status={invoice.status} />
                        </td>
                    </tr>
                ))}
            </DataTable>
        </div>
    )
}
