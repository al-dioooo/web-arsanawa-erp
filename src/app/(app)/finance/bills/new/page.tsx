"use client"

import { useRouter } from "next/navigation"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { fieldControlClassName } from "@/components/ui/form-control"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { InputDate } from "@/components/ui/input-date"
import { PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { SelectDescription } from "@/components/ui/select-description"
import { useSession } from "@/features/auth/session-provider"
import { useCOA, useTaxRates, type COAAccount } from "@/features/finance/api"
import { useCreateBill } from "@/features/finance/api-bills"
import { usePartners } from "@/features/finance/api-invoices"
import { formatIDR } from "@/lib/format"
import { cn } from "@/lib/utils"

type BillForm = {
    partner_id: string
    bill_date: string
    due_date: string
    notes: string
    lines: {
        description: string
        expense_account_id: string
        quantity: number
        unit_price: number
        tax_rate_id: string
    }[]
}

export default function NewBillPage() {
    const router = useRouter()
    const { activeCompanyId } = useSession()
    const t = useTranslations("finance.bills.form")
    const tDetail = useTranslations("finance.detail")
    const tCommon = useTranslations("common")

    // Data dependencies
    const { data: partners = [] } = usePartners(activeCompanyId, "supplier")
    const { data: accounts = [] } = useCOA(activeCompanyId)
    const { data: taxRates = [] } = useTaxRates(activeCompanyId)
    const createBill = useCreateBill()

    const { register, control, handleSubmit, watch, formState: { errors } } = useForm<BillForm>({
        defaultValues: {
            partner_id: "",
            bill_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            notes: "",
            lines: [
                { description: "", expense_account_id: "", quantity: 1, unit_price: 0, tax_rate_id: "" }
            ]
        }
    })

    const { fields, append, remove } = useFieldArray({
        control,
        name: "lines"
    })

    // eslint-disable-next-line react-hooks/incompatible-library
    const watchedLines = watch("lines")

    // Flatten accounts for dropdown
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
    const postableAccounts = flattenAccounts(accounts)

    // Calculate totals
    let subtotal = 0
    let tax_total = 0
    let withholding_total = 0

    watchedLines.forEach(line => {
        const lineSub = (line.quantity || 0) * (line.unit_price || 0)
        subtotal += lineSub

        if (line.tax_rate_id) {
            const tax = taxRates.find(rate => rate.id === parseInt(line.tax_rate_id))
            if (tax) {
                const taxAmt = lineSub * (parseFloat(tax.rate) / 100)
                if (tax.type === 'ppn') {
                    tax_total += taxAmt
                } else if (tax.type === 'pph') {
                    withholding_total += taxAmt
                }
            }
        }
    })

    const total = subtotal + tax_total - withholding_total

    const onSubmit = (data: BillForm) => {
        if (!data.partner_id) {
            toast.error(t("vendorMissing"))
            return
        }
        if (data.lines.some(l => !l.expense_account_id)) {
            toast.error(t("accountsMissing"))
            return
        }

        // Transform payload to strings as required by the backend API shape
        const apiLines = data.lines.map(l => {
            const lineSub = (l.quantity || 0) * (l.unit_price || 0)
            let tax_amount = 0
            let withholding_amount = 0

            if (l.tax_rate_id) {
                const tax = taxRates.find(rate => rate.id === parseInt(l.tax_rate_id))
                if (tax) {
                    const taxAmt = lineSub * (parseFloat(tax.rate) / 100)
                    if (tax.type === 'ppn') tax_amount = taxAmt
                    if (tax.type === 'pph') withholding_amount = taxAmt
                }
            }

            return {
                description: l.description,
                expense_account_id: parseInt(l.expense_account_id),
                quantity: String(l.quantity),
                unit_price: String(l.unit_price),
                discount: "0",
                line_subtotal: String(lineSub),
                tax_amount: String(tax_amount),
                withholding_amount: String(withholding_amount),
                line_total: String(lineSub + tax_amount - withholding_amount),
                tax_rate_id: l.tax_rate_id ? parseInt(l.tax_rate_id) : null
            }
        })

        const payload = {
            partner_id: parseInt(data.partner_id),
            bill_date: data.bill_date,
            due_date: data.due_date,
            notes: data.notes,
            subtotal: String(subtotal),
            discount_total: "0",
            tax_total: String(tax_total),
            withholding_total: String(withholding_total),
            total: String(total),
            status: "draft" as const,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            lines: apiLines as any
        }

        createBill.mutate(payload, {
            onSuccess: (res) => {
                toast.success(t("success"))
                router.push(`/finance/bills/${res.data.bill.id}`)
            },
            onError: (err: Error) => {
                toast.error(err?.message || t("error"))
            }
        })
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-6xl pb-10">
            <PageHeader
                backHref="/finance/bills"
                backLabel={tCommon("back")}
                eyebrow={t("eyebrow")}
                title={t("title")}
            />

            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                <Card padding="lg" className="md:col-span-2">
                    <h2 className="type-section mb-4 flex items-center gap-2">
                        <Icon name="storefront" size={18} className="text-ink-faint" /> {t("vendorTitle")}
                    </h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field label={t("vendor")} error={errors.partner_id?.message}>
                            <Controller
                                name="partner_id"
                                control={control}
                                rules={{ required: t("vendorRequired") }}
                                render={({ field }) => (
                                    <SearchableSelect
                                        value={field.value}
                                        onChange={(val) => field.onChange(String(val))}
                                        options={partners.map(p => ({ label: p.name, value: String(p.id) }))}
                                        placeholder={t("vendorPlaceholder")}
                                    />
                                )}
                            />
                        </Field>
                    </div>
                </Card>

                <Card padding="lg">
                    <h2 className="type-section mb-4 flex items-center gap-2">
                        <Icon name="calendar_today" size={18} className="text-ink-faint" /> {t("datesTitle")}
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                        <InputDate
                            label={t("billDate")}
                            error={errors.bill_date?.message}
                            {...register("bill_date", { required: t("billDateRequired") })}
                        />
                        <InputDate
                            label={t("dueDate")}
                            error={errors.due_date?.message}
                            {...register("due_date", { required: t("dueDateRequired") })}
                        />
                    </div>
                </Card>
            </div>

            <DataTable
                className="mb-6"
                minWidth={800}
                toolbar={
                    <h2 className="type-section flex items-center gap-2">
                        <Icon name="receipt_long" size={18} className="text-ink-faint" /> {t("linesTitle")}
                    </h2>
                }
                columns={[
                    { label: t("lineDescription"), className: "w-1/4" },
                    { label: t("expenseAccount"), className: "w-1/4" },
                    { label: t("qty"), className: "w-24" },
                    { label: t("unitPrice"), className: "w-32" },
                    { label: t("taxRate"), className: "w-32" },
                    { label: t("amount"), align: "end", className: "w-32" },
                    { label: "", className: "w-10" },
                ]}
                footer={
                    <div className="p-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => append({ description: "", expense_account_id: "", quantity: 1, unit_price: 0, tax_rate_id: "" })}
                        >
                            <Icon name="add" size={16} className="me-1" /> {t("addLine")}
                        </Button>
                    </div>
                }
            >
                {fields.map((field, index) => {
                    const line = watchedLines[index]
                    const lineSub = (line?.quantity || 0) * (line?.unit_price || 0)
                    let lineAmt = lineSub

                    if (line?.tax_rate_id) {
                        const tax = taxRates.find(rate => rate.id === parseInt(line.tax_rate_id!))
                        if (tax) {
                            const taxAmt = lineSub * (parseFloat(tax.rate) / 100)
                            if (tax.type === 'ppn') lineAmt += taxAmt
                            if (tax.type === 'pph') lineAmt -= taxAmt
                        }
                    }

                    return (
                        <tr key={field.id} className="group">
                            <td className="py-3">
                                <Input
                                    label={t("lineDescriptionLabel", { number: index + 1 })}
                                    hideLabel
                                    type="text"
                                    placeholder={t("lineDescriptionPlaceholder")}
                                    error={errors.lines?.[index]?.description?.message}
                                    {...register(`lines.${index}.description` as const, { required: t("required") })}
                                />
                            </td>
                            <td className="py-3">
                                <Controller
                                    name={`lines.${index}.expense_account_id` as const}
                                    control={control}
                                    rules={{ required: t("required") }}
                                    render={({ field: { value, onChange } }) => (
                                        <SearchableSelect
                                            value={value}
                                            onChange={(val) => onChange(String(val))}
                                            options={postableAccounts.map(a => ({ label: `${a.code} - ${a.name}`, value: String(a.id) }))}
                                            placeholder={t("accountPlaceholder")}
                                            error={errors.lines?.[index]?.expense_account_id?.message}
                                        />
                                    )}
                                />
                            </td>
                            <td className="py-3">
                                <Input
                                    label={t("lineQtyLabel", { number: index + 1 })}
                                    hideLabel
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="text-end"
                                    error={errors.lines?.[index]?.quantity?.message}
                                    {...register(`lines.${index}.quantity` as const, { valueAsNumber: true, required: t("required") })}
                                />
                            </td>
                            <td className="py-3">
                                <Input
                                    label={t("lineUnitPriceLabel", { number: index + 1 })}
                                    hideLabel
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="text-end"
                                    error={errors.lines?.[index]?.unit_price?.message}
                                    {...register(`lines.${index}.unit_price` as const, { valueAsNumber: true, required: t("required") })}
                                />
                            </td>
                            <td className="py-3">
                                <SelectDescription
                                    label={t("lineTaxLabel", { number: index + 1 })}
                                    hideLabel
                                    options={[
                                        { value: "", label: t("noTax"), description: t("noTaxDescription") },
                                        ...taxRates.map(rate => ({
                                            value: rate.id,
                                            label: `${rate.name} (${parseFloat(rate.rate)}%)`,
                                            description: t("taxRateDescription", { type: rate.type.toUpperCase() }),
                                        })),
                                    ]}
                                    {...register(`lines.${index}.tax_rate_id` as const)}
                                />
                            </td>
                            <td className="py-3 text-end font-medium text-ink tabular-nums">
                                {formatIDR(lineAmt)}
                            </td>
                            <td className="py-3 text-end">
                                <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    aria-label={t("removeLine", { number: index + 1 })}
                                    className="p-2 text-ink-faint opacity-0 transition-colors group-hover:opacity-100 hover:text-error"
                                    tabIndex={-1}
                                >
                                    <Icon name="delete" size={18} />
                                </button>
                            </td>
                        </tr>
                    )
                })}
            </DataTable>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card padding="lg">
                    <Field label={t("notes")}>
                        <textarea
                            rows={4}
                            className={cn(fieldControlClassName, "resize-none py-2.5")}
                            placeholder={t("notesPlaceholder")}
                            {...register("notes")}
                        ></textarea>
                    </Field>
                </Card>

                <Card padding="lg" className="flex flex-col justify-center gap-3">
                    <div className="flex justify-between text-sm font-semibold text-ink-muted">
                        <span>{tDetail("subtotal")}</span>
                        <span className="tabular-nums">{formatIDR(subtotal)}</span>
                    </div>
                    {tax_total > 0 && (
                        <div className="flex justify-between text-sm font-semibold text-ink-muted">
                            <span>{tDetail("ppn")}</span>
                            <span className="text-brand-ink tabular-nums">+{formatIDR(tax_total)}</span>
                        </div>
                    )}
                    {withholding_total > 0 && (
                        <div className="flex justify-between text-sm font-semibold text-ink-muted">
                            <span>{tDetail("pph")}</span>
                            <span className="text-error-strong tabular-nums">-{formatIDR(withholding_total)}</span>
                        </div>
                    )}
                    <div className="my-1 border-t border-line" />
                    <div className="flex items-center justify-between text-ink">
                        <span className="text-xl font-bold">{tDetail("total")}</span>
                        <span className="text-2xl font-bold tabular-nums">{formatIDR(total)}</span>
                    </div>
                </Card>
            </div>

            {/* Sticky action footer */}
            <div className="sticky bottom-0 z-10 mt-6 flex items-center justify-end gap-3 border-t border-line bg-surface/80 px-4 py-4 backdrop-blur">
                <Button type="submit" size="lg" disabled={createBill.isPending}>
                    {createBill.isPending ? t("creating") : t("create")}
                </Button>
            </div>
        </form>
    )
}
