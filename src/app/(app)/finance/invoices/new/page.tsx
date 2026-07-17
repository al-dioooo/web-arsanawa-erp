"use client"

import { useRouter } from "next/navigation"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { Field } from "@/components/ui/field"
import { Icon } from "@/components/ui/icon"
import { PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { useSession } from "@/features/auth/session-provider"
import { useCOA, useTaxRates, type COAAccount } from "@/features/finance/api"
import { useCreateInvoice, usePartners } from "@/features/finance/api-invoices"
import { formatIDR } from "@/lib/format"

type InvoiceLineForm = {
    description: string
    revenue_account_id: string
    tax_rate_id: string
    quantity: number
    unit_price: number
}

type InvoiceForm = {
    partner_id: string
    invoice_date: string
    due_date: string
    notes: string
    lines: InvoiceLineForm[]
}

export default function NewInvoicePage() {
    const router = useRouter()
    const { activeCompanyId } = useSession()
    const t = useTranslations("finance.invoices.form")
    const tDetail = useTranslations("finance.detail")
    const tCommon = useTranslations("common")

    // Data sources
    const { data: partners = [] } = usePartners(activeCompanyId, "customer")
    const { data: accounts = [] } = useCOA(activeCompanyId)
    const { data: taxRates = [] } = useTaxRates(activeCompanyId)
    const createInvoice = useCreateInvoice()

    const { register, control, handleSubmit, watch, formState: { errors } } = useForm<InvoiceForm>({
        defaultValues: {
            partner_id: "",
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            notes: "",
            lines: [{ description: "", revenue_account_id: "", tax_rate_id: "", quantity: 1, unit_price: 0 }]
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

    // Select options
    const partnerOptions = partners.map(p => ({ value: String(p.id), label: p.name }))
    const accountOptions = postableAccounts.map(a => ({ value: String(a.id), label: `${a.code} - ${a.name}` }))
    const taxOptions = [{ value: "", label: t("noTax") }, ...taxRates.filter(rate => rate.type === 'ppn').map(rate => ({ value: String(rate.id), label: `${rate.name} (${parseFloat(rate.rate)}%)` }))]

    // Calculations
    const calculateTotals = () => {
        let subtotal = 0
        let tax_total = 0

        watchedLines.forEach(line => {
            const lineSubtotal = (line.quantity || 0) * (line.unit_price || 0)
            subtotal += lineSubtotal

            if (line.tax_rate_id) {
                const taxRate = taxRates.find(rate => String(rate.id) === line.tax_rate_id)
                if (taxRate) {
                    tax_total += lineSubtotal * (parseFloat(taxRate.rate) / 100)
                }
            }
        })

        return { subtotal, tax_total, total: subtotal + tax_total }
    }

    const { subtotal, tax_total, total } = calculateTotals()

    const onSubmit = (data: InvoiceForm) => {
        if (!activeCompanyId) return

        // Compute final line items for API
        const apiLines = data.lines.map(line => {
            const line_subtotal = line.quantity * line.unit_price
            let tax_amount = 0
            if (line.tax_rate_id) {
                const taxRate = taxRates.find(rate => String(rate.id) === line.tax_rate_id)
                if (taxRate) {
                    tax_amount = line_subtotal * (parseFloat(taxRate.rate) / 100)
                }
            }
            return {
                description: line.description,
                revenue_account_id: parseInt(line.revenue_account_id),
                tax_rate_id: line.tax_rate_id ? parseInt(line.tax_rate_id) : null,
                quantity: String(line.quantity),
                unit_price: String(line.unit_price),
                discount: "0",
                line_subtotal: String(line_subtotal),
                tax_amount: String(tax_amount),
                line_total: String(line_subtotal + tax_amount)
            }
        })

        const payload = {
            company_id: activeCompanyId,
            partner_id: parseInt(data.partner_id),
            invoice_date: data.invoice_date,
            due_date: data.due_date,
            notes: data.notes,
            subtotal: String(subtotal),
            discount_total: "0",
            tax_total: String(tax_total),
            total: String(total),
            status: "draft" as const,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            lines: apiLines as any
        }

        createInvoice.mutate(payload, {
            onSuccess: (res) => {
                toast.success(t("success"))
                if (res.data?.invoice?.id) {
                    router.push(`/finance/invoices/${res.data.invoice.id}`)
                } else {
                    router.push("/finance/invoices")
                }
            },
            onError: (err: Error) => {
                toast.error(err?.message || t("error"))
            }
        })
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-5xl">
            <PageHeader
                backHref="/finance/invoices"
                backLabel={tCommon("back")}
                eyebrow={t("eyebrow")}
                title={t("title")}
            />

            <div className="grid gap-6">
                {/* Header Information */}
                <Card padding="lg">
                    <h2 className="type-section mb-6">{t("detailsTitle")}</h2>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <Controller
                            name="partner_id"
                            control={control}
                            rules={{ required: t("customerRequired") }}
                            render={({ field }) => (
                                <SearchableSelect
                                    label={t("customer")}
                                    options={partnerOptions}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder={t("customerPlaceholder")}
                                    error={errors.partner_id?.message}
                                />
                            )}
                        />
                        <div />

                        <Controller
                            name="invoice_date"
                            control={control}
                            rules={{ required: t("invoiceDateRequired") }}
                            render={({ field }) => (
                                <DatePicker
                                    label={t("invoiceDate")}
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors.invoice_date?.message}
                                />
                            )}
                        />
                        <Controller
                            name="due_date"
                            control={control}
                            rules={{ required: t("dueDateRequired") }}
                            render={({ field }) => (
                                <DatePicker
                                    label={t("dueDate")}
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors.due_date?.message}
                                />
                            )}
                        />
                    </div>
                </Card>

                {/* Line Items */}
                <Card padding="lg">
                    <h2 className="type-section mb-6">{t("linesTitle")}</h2>

                    <div className="mb-6 grid gap-4">
                        {fields.map((field, index) => (
                            <div
                                key={field.id}
                                className="group relative grid grid-cols-12 items-start gap-3 rounded-lg bg-surface-muted p-4"
                            >
                                <div className="col-span-12 md:col-span-3">
                                    <Field
                                        label={t("lineDescription")}
                                        placeholder={t("lineDescriptionPlaceholder")}
                                        error={errors.lines?.[index]?.description?.message}
                                        {...register(`lines.${index}.description` as const, { required: t("required") })}
                                    />
                                </div>
                                <div className="col-span-12 md:col-span-3">
                                    <Controller
                                        name={`lines.${index}.revenue_account_id` as const}
                                        control={control}
                                        rules={{ required: t("required") }}
                                        render={({ field }) => (
                                            <SearchableSelect
                                                label={t("revenueAccount")}
                                                options={accountOptions}
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={errors.lines?.[index]?.revenue_account_id?.message}
                                            />
                                        )}
                                    />
                                </div>
                                <div className="col-span-4 md:col-span-2">
                                    <Field
                                        label={t("qty")}
                                        type="number"
                                        step="0.01"
                                        error={errors.lines?.[index]?.quantity?.message}
                                        {...register(`lines.${index}.quantity` as const, { required: t("required"), valueAsNumber: true })}
                                    />
                                </div>
                                <div className="col-span-4 md:col-span-2">
                                    <Field
                                        label={t("unitPrice")}
                                        type="number"
                                        step="0.01"
                                        error={errors.lines?.[index]?.unit_price?.message}
                                        {...register(`lines.${index}.unit_price` as const, { required: t("required"), valueAsNumber: true })}
                                    />
                                </div>
                                <div className="col-span-4 md:col-span-2">
                                    <Controller
                                        name={`lines.${index}.tax_rate_id` as const}
                                        control={control}
                                        render={({ field }) => (
                                            <SearchableSelect
                                                label={t("tax")}
                                                options={taxOptions}
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    aria-label={t("removeLine", { number: index + 1 })}
                                    className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-pill bg-surface text-error shadow-card opacity-0 transition-all group-hover:opacity-100 hover:bg-error hover:text-white"
                                >
                                    <Icon name="close" size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => append({ description: "", revenue_account_id: "", tax_rate_id: "", quantity: 1, unit_price: 0 })}
                    >
                        <Icon name="add" size={16} className="me-1" /> {t("addLine")}
                    </Button>
                </Card>

                {/* Footer / Summary */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Card padding="lg">
                        <Field
                            label={t("notes")}
                            placeholder={t("notesPlaceholder")}
                            {...register("notes")}
                        />
                    </Card>
                    <Card padding="lg" className="flex flex-col gap-3">
                        <div className="flex justify-between text-sm font-semibold text-ink-muted">
                            <span>{tDetail("subtotal")}</span>
                            <span className="tabular-nums">{formatIDR(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold text-ink-muted">
                            <span>{tDetail("taxTotal")}</span>
                            <span className="tabular-nums">{formatIDR(tax_total)}</span>
                        </div>
                        <div className="my-1 border-t border-line" />
                        <div className="flex justify-between text-xl font-bold text-ink">
                            <span>{tDetail("total")}</span>
                            <span className="tabular-nums">{formatIDR(total)}</span>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Sticky action footer */}
            <div className="sticky bottom-0 z-10 mt-6 -mx-2 flex items-center justify-end gap-3 border-t border-line bg-surface/80 px-4 py-4 backdrop-blur">
                <Button type="submit" size="lg" disabled={createInvoice.isPending}>
                    {createInvoice.isPending ? t("saving") : t("saveDraft")}
                </Button>
            </div>
        </form>
    )
}
