"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { PageHeader } from "@/features/finance/components/page-header"
import { useSession } from "@/features/auth/session-provider"
import { useCreatePayment } from "@/features/finance/api-payments"
import { usePartners, useInvoices } from "@/features/finance/api-invoices" 
import { useCOA, type COAAccount } from "@/features/finance/api"
import { Field } from "@/components/ui/field"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Icon } from "@/components/ui/icon"
import { formatIDR, formatDateID } from "@/lib/format"
import { toast } from "sonner"

type ReceiptForm = {
    partner_id: string
    account_id: string
    payment_date: string
    payment_method: string
    reference_number: string
    amount: number
    notes: string
}

export default function NewReceiptPage() {
    const router = useRouter()
    const { activeCompanyId } = useSession()

    const { data: partners = [] } = usePartners(activeCompanyId)
    const { data: accounts = [] } = useCOA(activeCompanyId)
    const { data: invoices = [] } = useInvoices(activeCompanyId)
    const createPayment = useCreatePayment()

    const { register, control, handleSubmit, watch, formState: { errors } } = useForm<ReceiptForm>({
        defaultValues: {
            partner_id: "",
            account_id: "",
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: "bank_transfer",
            reference_number: "",
            amount: 0,
            notes: ""
        }
    })

    const watchedPartnerId = watch("partner_id")
    const watchedAmount = watch("amount")

    const flattenAccounts = (nodes: COAAccount[]): COAAccount[] => {
        const flat: COAAccount[] = []
        function traverse(nodeList: COAAccount[]) {
            for (const node of nodeList) {
                if (node.is_postable) flat.push(node)
                if (node.children) traverse(node.children)
            }
        }
        traverse(nodes)
        return flat
    }
    const assetAccounts = flattenAccounts(accounts).filter(a => String(a.code).startsWith('1'))

    // Filter unpaid invoices for the selected customer
    const unpaidInvoices = invoices.filter(inv => 
        inv.partner_id === parseInt(watchedPartnerId) && 
        (inv.status === 'posted' || inv.status === 'partially_paid' || inv.status === 'overdue')
    )

    const [allocations, setAllocations] = useState<Record<number, number>>({})

    const handleAllocate = (invoiceId: number, amountStr: string) => {
        const val = parseFloat(amountStr) || 0
        setAllocations(prev => ({ ...prev, [invoiceId]: val }))
    }

    const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + val, 0)
    const unallocated = (watchedAmount || 0) - totalAllocated

    const onSubmit = (data: ReceiptForm) => {
        if (!data.partner_id) return toast.error("Customer is required")
        if (!data.account_id) return toast.error("Bank account is required")
        if (data.amount <= 0) return toast.error("Amount must be greater than zero")
        if (unallocated < 0) return toast.error("Allocations cannot exceed the receipt amount")

        const apiAllocations = Object.entries(allocations)
            .filter(([_invoiceId, amt]) => amt > 0)
            .map(([invoiceId, amt]) => ({
                allocatable_type: 'invoice' as const,
                allocatable_id: parseInt(invoiceId),
                amount: String(amt)
            }))

        const payload = {
            partner_id: parseInt(data.partner_id),
            account_id: parseInt(data.account_id),
            payment_type: 'incoming' as const,
            payment_date: data.payment_date,
            payment_method: data.payment_method,
            reference_number: data.reference_number || null,
            amount: String(data.amount),
            unallocated_amount: String(unallocated),
            notes: data.notes,
            status: 'draft' as const,
            allocations: apiAllocations
        }

        createPayment.mutate(payload, {
            onSuccess: (res) => {
                toast.success("Receipt drafted successfully")
                router.push(`/finance/payments/${res.data.payment.id}`)
            },
            onError: (err: Error) => {
                toast.error(err?.message || "Failed to draft receipt")
            }
        })
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-5xl pb-20">
            <PageHeader
                title="New Incoming Receipt"
                primaryAction={{
                    label: createPayment.isPending ? "Drafting..." : "Draft Receipt",
                    onClick: () => {},
                    disabled: createPayment.isPending
                }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6">
                    <h2 className="text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
                        <Icon name="account_balance_wallet" /> Receipt Details
                    </h2>
                    
                    <div className="grid gap-4">
                        <Field label="Customer" error={errors.partner_id?.message}>
                            <Controller
                                name="partner_id"
                                control={control}
                                rules={{ required: "Customer is required" }}
                                render={({ field }) => (
                                    <SearchableSelect
                                        value={field.value}
                                        onChange={(val) => {
                                            field.onChange(String(val))
                                            setAllocations({})
                                        }}
                                        options={partners.map(p => ({ label: p.name, value: String(p.id) }))}
                                        placeholder="Select customer..."
                                    />
                                )}
                            />
                        </Field>

                        <Field label="Deposited To (Kas & Bank)" error={errors.account_id?.message}>
                            <Controller
                                name="account_id"
                                control={control}
                                rules={{ required: "Bank account is required" }}
                                render={({ field }) => (
                                    <SearchableSelect
                                        value={field.value}
                                        onChange={(val) => field.onChange(String(val))}
                                        options={assetAccounts.map(a => ({ label: `${a.code} - ${a.name}`, value: String(a.id) }))}
                                        placeholder="Select bank account..."
                                    />
                                )}
                            />
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Receipt Date" error={errors.payment_date?.message}>
                                <input
                                    type="date"
                                    className="w-full h-10 px-3 rounded-xl border border-navy-200 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow bg-navy-50/30"
                                    {...register("payment_date", { required: "Date is required" })}
                                />
                            </Field>
                            <Field label="Payment Method">
                                <select
                                    className="w-full h-10 px-3 rounded-xl border border-navy-200 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow bg-navy-50/30"
                                    {...register("payment_method")}
                                >
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cash">Cash</option>
                                    <option value="check">Check / Giro</option>
                                </select>
                            </Field>
                        </div>

                        <Field label="Amount Received" error={errors.amount?.message}>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500 font-semibold">Rp</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="w-full h-10 pl-10 pr-3 rounded-xl border border-navy-200 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow bg-white text-lg font-bold text-teal-700"
                                    {...register("amount", { valueAsNumber: true, required: "Amount is required" })}
                                />
                            </div>
                        </Field>

                        <Field label="Reference No. (Optional)">
                            <input
                                type="text"
                                placeholder="e.g. TRF-12345"
                                className="w-full h-10 px-3 rounded-xl border border-navy-200 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow bg-navy-50/30"
                                {...register("reference_number")}
                            />
                        </Field>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6 flex-1 flex flex-col justify-center">
                        <div className="flex justify-between text-navy-500 mb-3">
                            <span className="font-semibold">Total Receipt</span>
                            <span className="text-lg font-bold text-teal-700">{formatIDR(watchedAmount || 0)}</span>
                        </div>
                        <div className="flex justify-between text-navy-500 mb-3">
                            <span className="font-semibold">Amount Allocated</span>
                            <span className="text-navy-900 font-medium">{formatIDR(totalAllocated)}</span>
                        </div>
                        <div className="border-t border-navy-100 my-4" />
                        <div className="flex justify-between text-navy-900">
                            <span className="text-sm font-semibold uppercase tracking-wider text-navy-400">Unallocated (Prepayment)</span>
                            <span className={`text-xl font-bold ${unallocated < 0 ? 'text-rose-500' : 'text-teal-700'}`}>
                                {formatIDR(unallocated)}
                            </span>
                        </div>
                        {unallocated < 0 && (
                            <div className="text-rose-500 text-sm mt-2 font-medium">
                                Allocations exceed receipt amount!
                            </div>
                        )}
                        {unallocated > 0 && (
                            <div className="text-teal-600 text-sm mt-2 font-medium bg-teal-50 p-2 rounded-lg">
                                The remaining {formatIDR(unallocated)} will be posted as a Customer Prepayment.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {watchedPartnerId && (
                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6 mb-6 overflow-x-auto">
                    <h2 className="text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
                        <Icon name="receipt_long" /> Outstanding Invoices for Allocation
                    </h2>
                    
                    {unpaidInvoices.length === 0 ? (
                        <div className="text-center py-8 text-navy-500 bg-navy-50/50 rounded-xl">
                            No open invoices found for this customer. Entire receipt will be recorded as a prepayment.
                        </div>
                    ) : (
                        <table className="w-full min-w-[600px] text-left border-collapse">
                            <thead>
                                <tr className="border-b border-navy-200 text-sm text-navy-500">
                                    <th className="pb-3 font-semibold">Invoice No.</th>
                                    <th className="pb-3 font-semibold">Date</th>
                                    <th className="pb-3 font-semibold text-right">Invoice Total</th>
                                    <th className="pb-3 font-semibold text-right">Balance Due</th>
                                    <th className="pb-3 font-semibold text-right w-48">Allocation Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {unpaidInvoices.map(inv => {
                                    const total = parseFloat(inv.total)
                                    const paid = parseFloat(inv.amount_paid)
                                    const due = total - paid
                                    const alloc = allocations[inv.id] || ''

                                    return (
                                        <tr key={inv.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/30">
                                            <td className="py-3 text-navy-900 font-medium">{inv.invoice_number}</td>
                                            <td className="py-3 text-navy-700">{formatDateID(inv.invoice_date)}</td>
                                            <td className="py-3 text-navy-700 text-right">{formatIDR(total)}</td>
                                            <td className="py-3 text-teal-600 font-semibold text-right">{formatIDR(due)}</td>
                                            <td className="py-3 pl-4">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 text-xs font-semibold">Rp</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={due}
                                                        step="any"
                                                        value={alloc}
                                                        onChange={e => handleAllocate(inv.id, e.target.value)}
                                                        className="w-full h-9 pl-8 pr-2 rounded-lg border border-navy-200 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow bg-white text-sm text-right font-medium text-navy-900"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            <button type="submit" className="hidden" />
        </form>
    )
}
