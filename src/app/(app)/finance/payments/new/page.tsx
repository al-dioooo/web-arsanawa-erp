"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { PageHeader } from "@/features/finance/components/page-header"
import { useSession } from "@/features/auth/session-provider"
import { useCreatePayment } from "@/features/finance/api-payments"
import { usePartners } from "@/features/finance/api-invoices"
import { useBills } from "@/features/finance/api-bills"
import { useCOA, type COAAccount } from "@/features/finance/api"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputDate } from "@/components/ui/input-date"
import { SelectDescription } from "@/components/ui/select-description"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Icon } from "@/components/ui/icon"
import { formatIDR, formatDateID } from "@/lib/format"
import { toast } from "sonner"

type PaymentForm = {
    partner_id: string
    account_id: string
    payment_date: string
    payment_method: string
    reference_number: string
    amount: number
    notes: string
}

export default function NewPaymentPage() {
    const router = useRouter()
    const { activeCompanyId } = useSession()

    // Data dependencies
    const { data: partners = [] } = usePartners(activeCompanyId, "supplier")
    const { data: accounts = [] } = useCOA(activeCompanyId)
    const { data: bills = [] } = useBills(activeCompanyId)
    const createPayment = useCreatePayment()

    const { register, control, handleSubmit, watch, formState: { errors } } = useForm<PaymentForm>({
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

    // Filter postable asset accounts for Kas & Bank (usually 1xxxx)
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

    // Filter unpaid bills for the selected vendor
    const unpaidBills = bills.filter(b => 
        b.partner_id === parseInt(watchedPartnerId) && 
        (b.status === 'posted' || b.status === 'partially_paid')
    )

    const [allocations, setAllocations] = useState<Record<number, number>>({})

    const handleAllocate = (billId: number, amountStr: string) => {
        const val = parseFloat(amountStr) || 0
        setAllocations(prev => ({ ...prev, [billId]: val }))
    }

    const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + val, 0)
    const unallocated = (watchedAmount || 0) - totalAllocated

    const onSubmit = (data: PaymentForm) => {
        if (!data.partner_id) return toast.error("Vendor is required")
        if (!data.account_id) return toast.error("Payment account is required")
        if (data.amount <= 0) return toast.error("Amount must be greater than zero")
        if (unallocated < 0) return toast.error("Allocations cannot exceed the payment amount")

        const apiAllocations = Object.entries(allocations)
            .filter(([_billId, amt]) => amt > 0)
            .map(([billId, amt]) => ({
                allocatable_type: 'bill' as const,
                allocatable_id: parseInt(billId),
                amount: String(amt)
            }))

        const payload = {
            partner_id: parseInt(data.partner_id),
            account_id: parseInt(data.account_id),
            payment_type: 'outgoing' as const,
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
                toast.success("Payment drafted successfully")
                router.push(`/finance/payments/${res.data.payment.id}`) // Will fall back if needed
            },
            onError: (err: Error) => {
                toast.error(err?.message || "Failed to draft payment")
            }
        })
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-5xl pb-20">
            <PageHeader
                title="New Outgoing Payment"
                primaryAction={{
                    label: createPayment.isPending ? "Drafting..." : "Draft Payment",
                    onClick: () => {},
                    disabled: createPayment.isPending
                }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6">
                    <h2 className="text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
                        <Icon name="account_balance_wallet" /> Payment Details
                    </h2>
                    
                    <div className="grid gap-4">
                        <Field label="Vendor (Supplier)" error={errors.partner_id?.message}>
                            <Controller
                                name="partner_id"
                                control={control}
                                rules={{ required: "Vendor is required" }}
                                render={({ field }) => (
                                    <SearchableSelect
                                        value={field.value}
                                        onChange={(val) => {
                                            field.onChange(String(val))
                                            setAllocations({}) // Reset allocations on vendor change
                                        }}
                                        options={partners.map(p => ({ label: p.name, value: String(p.id) }))}
                                        placeholder="Select vendor..."
                                    />
                                )}
                            />
                        </Field>

                        <Field label="Paid From (Kas & Bank)" error={errors.account_id?.message}>
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
                            <InputDate
                                label="Payment Date"
                                error={errors.payment_date?.message}
                                {...register("payment_date", { required: "Date is required" })}
                            />
                            <SelectDescription
                                label="Payment Method"
                                options={[
                                    { value: "bank_transfer", label: "Bank Transfer", description: "Settle through a bank transfer account." },
                                    { value: "cash", label: "Cash", description: "Settle directly through a cash account." },
                                    { value: "check", label: "Check / Giro", description: "Settle using check or giro reference." },
                                ]}
                                {...register("payment_method")}
                            />
                        </div>

                        <Input
                            label="Amount Paid"
                            error={errors.amount?.message}
                            type="number"
                            min="0"
                            step="any"
                            className="text-lg font-bold"
                            {...register("amount", { valueAsNumber: true, required: "Amount is required" })}
                        />

                        <Input
                            label="Reference No. (Optional)"
                            type="text"
                            placeholder="e.g. TRF-12345"
                            {...register("reference_number")}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6 flex-1 flex flex-col justify-center">
                        <div className="flex justify-between text-navy-500 mb-3">
                            <span className="font-semibold">Total Payment</span>
                            <span className="text-lg font-bold text-navy-900">{formatIDR(watchedAmount || 0)}</span>
                        </div>
                        <div className="flex justify-between text-navy-500 mb-3">
                            <span className="font-semibold">Amount Allocated</span>
                            <span className="text-teal-600">{formatIDR(totalAllocated)}</span>
                        </div>
                        <div className="border-t border-navy-100 my-4" />
                        <div className="flex justify-between text-navy-900">
                            <span className="text-sm font-semibold uppercase tracking-wider text-navy-400">Unallocated (Prepayment)</span>
                            <span className={`text-xl font-bold ${unallocated < 0 ? 'text-rose-500' : 'text-navy-900'}`}>
                                {formatIDR(unallocated)}
                            </span>
                        </div>
                        {unallocated < 0 && (
                            <div className="text-rose-500 text-sm mt-2 font-medium">
                                Allocations exceed payment amount!
                            </div>
                        )}
                        {unallocated > 0 && (
                            <div className="text-orange-600 text-sm mt-2 font-medium bg-orange-50 p-2 rounded-lg">
                                The remaining {formatIDR(unallocated)} will be posted as a Vendor Prepayment.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {watchedPartnerId && (
                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6 mb-6 overflow-x-auto">
                    <h2 className="text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
                        <Icon name="receipt_long" /> Outstanding Bills for Allocation
                    </h2>
                    
                    {unpaidBills.length === 0 ? (
                        <div className="text-center py-8 text-navy-500 bg-navy-50/50 rounded-xl">
                            No open bills found for this vendor. Entire payment will be recorded as a prepayment.
                        </div>
                    ) : (
                        <table className="w-full min-w-[600px] text-left border-collapse">
                            <thead>
                                <tr className="border-b border-navy-200 text-sm text-navy-500">
                                    <th className="pb-3 font-semibold">Bill No.</th>
                                    <th className="pb-3 font-semibold">Date</th>
                                    <th className="pb-3 font-semibold text-right">Bill Total</th>
                                    <th className="pb-3 font-semibold text-right">Balance Due</th>
                                    <th className="pb-3 font-semibold text-right w-48">Allocation Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {unpaidBills.map(bill => {
                                    const total = parseFloat(bill.total)
                                    const paid = parseFloat(bill.amount_paid)
                                    const due = total - paid
                                    const alloc = allocations[bill.id] || ''

                                    return (
                                        <tr key={bill.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/30">
                                            <td className="py-3 text-navy-900 font-medium">{bill.bill_number}</td>
                                            <td className="py-3 text-navy-700">{formatDateID(bill.bill_date)}</td>
                                            <td className="py-3 text-navy-700 text-right">{formatIDR(total)}</td>
                                            <td className="py-3 text-rose-600 font-semibold text-right">{formatIDR(due)}</td>
                                            <td className="py-3 pl-4">
                                                <Input
                                                    label={`Allocation for ${bill.bill_number}`}
                                                    hideLabel
                                                    type="number"
                                                    min="0"
                                                    max={due}
                                                    step="any"
                                                    value={alloc}
                                                    onChange={e => handleAllocate(bill.id, e.target.value)}
                                                    className="min-h-9 text-right font-medium"
                                                    placeholder="0"
                                                />
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
