"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { InputDate } from "@/components/ui/input-date"
import { PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { SelectDescription } from "@/components/ui/select-description"
import { TableStateRow } from "@/components/ui/table-state-row"
import { useSession } from "@/features/auth/session-provider"
import { useCOA, type COAAccount } from "@/features/finance/api"
import { usePartners, useInvoices } from "@/features/finance/api-invoices"
import { useCreatePayment } from "@/features/finance/api-payments"
import { formatIDR, formatDateID } from "@/lib/format"
import { cn } from "@/lib/utils"

type ReceiptForm = {
    partner_id: string
    cash_account_id: string
    payment_date: string
    payment_method: string
    reference_number: string
    amount: number
    notes: string
}

export default function NewReceiptPage() {
    const router = useRouter()
    const { activeCompanyId } = useSession()
    const t = useTranslations("finance.receipts.form")
    const tCommon = useTranslations("common")

    const { data: partners = [] } = usePartners(activeCompanyId, "customer")
    const { data: accounts = [] } = useCOA(activeCompanyId)
    const { data: invoices = [] } = useInvoices(activeCompanyId)
    const createPayment = useCreatePayment()

    const { register, control, handleSubmit, watch, formState: { errors } } = useForm<ReceiptForm>({
        defaultValues: {
            partner_id: "",
            cash_account_id: "",
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
        if (!data.partner_id) return toast.error(t("customerRequired"))
        if (!data.cash_account_id) return toast.error(t("accountRequired"))
        if (data.amount <= 0) return toast.error(t("amountInvalid"))
        if (unallocated < 0) return toast.error(t("overAllocatedToast"))

        const apiAllocations = Object.entries(allocations)
            .filter((entry) => entry[1] > 0)
            .map(([invoiceId, amt]) => ({
                invoice_id: parseInt(invoiceId),
                amount: String(amt)
            }))

        const payload = {
            partner_id: parseInt(data.partner_id),
            cash_account_id: parseInt(data.cash_account_id),
            payment_type: 'inbound' as const,
            payment_date: data.payment_date,
            payment_method: data.payment_method,
            amount: String(data.amount),
            notes: data.notes || data.reference_number || null,
            allocations: apiAllocations
        }

        createPayment.mutate(payload, {
            onSuccess: (res) => {
                toast.success(t("success"))
                router.push(`/finance/payments/${res.data.payment.id}`)
            },
            onError: (err: Error) => {
                toast.error(err?.message || t("error"))
            }
        })
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-5xl pb-10">
            <PageHeader
                backHref="/finance/receipts"
                backLabel={tCommon("back")}
                eyebrow={t("eyebrow")}
                title={t("title")}
            />

            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card padding="lg">
                    <h2 className="type-section mb-4 flex items-center gap-2">
                        <Icon name="account_balance_wallet" size={18} className="text-ink-faint" />
                        {t("detailsTitle")}
                    </h2>

                    <div className="grid gap-4">
                        <Field label={t("customer")} error={errors.partner_id?.message}>
                            <Controller
                                name="partner_id"
                                control={control}
                                rules={{ required: t("customerRequired") }}
                                render={({ field }) => (
                                    <SearchableSelect
                                        value={field.value}
                                        onChange={(val) => {
                                            field.onChange(String(val))
                                            setAllocations({})
                                        }}
                                        options={partners.map(p => ({ label: p.name, value: String(p.id) }))}
                                        placeholder={t("customerPlaceholder")}
                                    />
                                )}
                            />
                        </Field>

                        <Field label={t("depositedTo")} error={errors.cash_account_id?.message}>
                            <Controller
                                name="cash_account_id"
                                control={control}
                                rules={{ required: t("accountRequired") }}
                                render={({ field }) => (
                                    <SearchableSelect
                                        value={field.value}
                                        onChange={(val) => field.onChange(String(val))}
                                        options={assetAccounts.map(a => ({ label: `${a.code} - ${a.name}`, value: String(a.id) }))}
                                        placeholder={t("accountPlaceholder")}
                                    />
                                )}
                            />
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <InputDate
                                label={t("receiptDate")}
                                error={errors.payment_date?.message}
                                {...register("payment_date", { required: t("dateRequired") })}
                            />
                            <SelectDescription
                                label={t("method")}
                                options={[
                                    { value: "bank_transfer", label: t("methodBankTransfer"), description: t("methodBankTransferDescription") },
                                    { value: "cash", label: t("methodCash"), description: t("methodCashDescription") },
                                    { value: "check", label: t("methodCheck"), description: t("methodCheckDescription") },
                                ]}
                                {...register("payment_method")}
                            />
                        </div>

                        <Input
                            label={t("amount")}
                            error={errors.amount?.message}
                            type="number"
                            min="0"
                            step="any"
                            className="text-lg font-bold text-brand-ink"
                            {...register("amount", { valueAsNumber: true, required: t("amountRequired") })}
                        />

                        <Input
                            label={t("reference")}
                            type="text"
                            placeholder={t("referencePlaceholder")}
                            {...register("reference_number")}
                        />
                    </div>
                </Card>

                <div className="flex flex-col gap-6">
                    <Card padding="lg" className="flex flex-1 flex-col justify-center">
                        <div className="mb-3 flex justify-between text-sm text-ink-muted">
                            <span className="font-semibold">{t("totalReceipt")}</span>
                            <span className="text-lg font-bold text-brand-ink tabular-nums">
                                {formatIDR(watchedAmount || 0)}
                            </span>
                        </div>
                        <div className="mb-3 flex justify-between text-sm text-ink-muted">
                            <span className="font-semibold">{t("amountAllocated")}</span>
                            <span className="font-medium text-ink tabular-nums">{formatIDR(totalAllocated)}</span>
                        </div>
                        <div className="my-4 border-t border-line" />
                        <div className="flex items-center justify-between">
                            <span className="type-card-label">{t("unallocated")}</span>
                            <span
                                className={cn(
                                    "text-xl font-bold tabular-nums",
                                    unallocated < 0 ? "text-error-strong" : "text-brand-ink",
                                )}
                            >
                                {formatIDR(unallocated)}
                            </span>
                        </div>
                        {unallocated < 0 && (
                            <div className="mt-2 text-sm font-medium text-error-strong">
                                {t("overAllocated")}
                            </div>
                        )}
                        {unallocated > 0 && (
                            <div className="mt-2 rounded-md bg-brand-soft p-2 text-sm font-medium text-brand-ink">
                                {t("prepaymentHint", { amount: formatIDR(unallocated) })}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {watchedPartnerId && (
                <DataTable
                    className="mb-6"
                    minWidth={600}
                    toolbar={
                        <h2 className="type-section flex items-center gap-2">
                            <Icon name="receipt_long" size={18} className="text-ink-faint" />
                            {t("allocationsTitle")}
                        </h2>
                    }
                    columns={[
                        t("invoiceNo"),
                        t("date"),
                        { label: t("invoiceTotal"), align: "end" },
                        { label: t("balanceDue"), align: "end" },
                        { label: t("allocationAmount"), align: "end", className: "w-48" },
                    ]}
                >
                    <TableStateRow
                        isLoading={false}
                        count={unpaidInvoices.length}
                        columns={5}
                        emptyMessage={t("allocationsEmpty")}
                    />
                    {unpaidInvoices.map(inv => {
                        const total = parseFloat(inv.total)
                        const paid = parseFloat(inv.amount_paid)
                        const due = total - paid
                        const alloc = allocations[inv.id] || ''

                        return (
                            <tr key={inv.id}>
                                <td className="py-3 font-medium text-ink">{inv.invoice_number}</td>
                                <td className="py-3">{formatDateID(inv.invoice_date)}</td>
                                <td className="py-3 text-end tabular-nums">{formatIDR(total)}</td>
                                <td className="py-3 text-end font-semibold text-brand-ink tabular-nums">
                                    {formatIDR(due)}
                                </td>
                                <td className="py-3">
                                    <Input
                                        label={t("allocationFor", { number: inv.invoice_number })}
                                        hideLabel
                                        type="number"
                                        min="0"
                                        max={due}
                                        step="any"
                                        value={alloc}
                                        onChange={e => handleAllocate(inv.id, e.target.value)}
                                        className="min-h-9 text-end font-medium"
                                        placeholder="0"
                                    />
                                </td>
                            </tr>
                        )
                    })}
                </DataTable>
            )}

            {/* Sticky action footer */}
            <div className="sticky bottom-0 z-10 mt-6 flex items-center justify-end gap-3 border-t border-line bg-surface/80 px-4 py-4 backdrop-blur">
                <Button type="submit" size="lg" disabled={createPayment.isPending}>
                    {createPayment.isPending ? t("drafting") : t("draft")}
                </Button>
            </div>
        </form>
    )
}
