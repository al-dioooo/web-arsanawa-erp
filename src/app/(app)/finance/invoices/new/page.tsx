"use client"

import { useRouter } from "next/navigation"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { PageHeader } from "@/features/finance/components/page-header"
import { useSession } from "@/features/auth/session-provider"
import { useCreateInvoice, usePartners } from "@/features/finance/api-invoices"
import { useCOA, useTaxRates, type COAAccount } from "@/features/finance/api"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { DatePicker } from "@/components/ui/date-picker"
import { Icon } from "@/components/ui/icon"
import { formatIDR } from "@/lib/format"
import { toast } from "sonner"

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
    const taxOptions = [{ value: "", label: "No Tax" }, ...taxRates.filter(t => t.type === 'ppn').map(t => ({ value: String(t.id), label: `${t.name} (${parseFloat(t.rate)}%)` }))]

    // Calculations
    const calculateTotals = () => {
        let subtotal = 0
        let tax_total = 0

        watchedLines.forEach(line => {
            const lineSubtotal = (line.quantity || 0) * (line.unit_price || 0)
            subtotal += lineSubtotal

            if (line.tax_rate_id) {
                const taxRate = taxRates.find(t => String(t.id) === line.tax_rate_id)
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
                const taxRate = taxRates.find(t => String(t.id) === line.tax_rate_id)
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
                toast.success("Invoice created successfully as Draft")
                if (res.data?.invoice?.id) {
                    router.push(`/finance/invoices/${res.data.invoice.id}`)
                } else {
                    router.push("/finance/invoices")
                }
            },
            onError: (err: Error) => {
                toast.error(err?.message || "Failed to create invoice")
            }
        })
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-5xl">
            <PageHeader
                title="Create New Invoice"
                primaryAction={{
                    label: createInvoice.isPending ? "Saving..." : "Save Draft",
                    onClick: handleSubmit(onSubmit),
                    disabled: createInvoice.isPending
                }}
            />

            <div className="grid gap-6">
                {/* Header Information */}
                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6">
                    <h2 className="text-lg font-bold text-navy-900 mb-6">Invoice Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Controller
                            name="partner_id"
                            control={control}
                            rules={{ required: "Customer is required" }}
                            render={({ field }) => (
                                <SearchableSelect
                                    label="Customer (Partner)"
                                    options={partnerOptions}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Select customer..."
                                    error={errors.partner_id?.message}
                                />
                            )}
                        />
                        <div />
                        
                        <Controller
                            name="invoice_date"
                            control={control}
                            rules={{ required: "Invoice date is required" }}
                            render={({ field }) => (
                                <DatePicker
                                    label="Invoice Date"
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors.invoice_date?.message}
                                />
                            )}
                        />
                        <Controller
                            name="due_date"
                            control={control}
                            rules={{ required: "Due date is required" }}
                            render={({ field }) => (
                                <DatePicker
                                    label="Due Date"
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors.due_date?.message}
                                />
                            )}
                        />
                    </div>
                </div>

                {/* Line Items */}
                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6">
                    <h2 className="text-lg font-bold text-navy-900 mb-6">Line Items</h2>
                    
                    <div className="grid gap-4 mb-6">
                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-3 items-start bg-navy-50/50 p-4 rounded-xl border border-navy-100 relative group">
                                <div className="col-span-12 md:col-span-3">
                                    <Field
                                        label="Description"
                                        placeholder="Item description..."
                                        error={errors.lines?.[index]?.description?.message}
                                        {...register(`lines.${index}.description` as const, { required: "Required" })}
                                    />
                                </div>
                                <div className="col-span-12 md:col-span-3">
                                    <Controller
                                        name={`lines.${index}.revenue_account_id` as const}
                                        control={control}
                                        rules={{ required: "Required" }}
                                        render={({ field }) => (
                                            <SearchableSelect
                                                label="Revenue Account"
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
                                        label="Qty"
                                        type="number"
                                        step="0.01"
                                        error={errors.lines?.[index]?.quantity?.message}
                                        {...register(`lines.${index}.quantity` as const, { required: "Required", valueAsNumber: true })}
                                    />
                                </div>
                                <div className="col-span-4 md:col-span-2">
                                    <Field
                                        label="Unit Price"
                                        type="number"
                                        step="0.01"
                                        error={errors.lines?.[index]?.unit_price?.message}
                                        {...register(`lines.${index}.unit_price` as const, { required: "Required", valueAsNumber: true })}
                                    />
                                </div>
                                <div className="col-span-4 md:col-span-2">
                                    <Controller
                                        name={`lines.${index}.tax_rate_id` as const}
                                        control={control}
                                        render={({ field }) => (
                                            <SearchableSelect
                                                label="Tax"
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
                                    className="absolute -right-2 -top-2 bg-white text-rose-500 hover:text-white hover:bg-rose-500 border border-navy-100 shadow-sm rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Icon name="close" className="text-xs font-bold" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <Button 
                        type="button" 
                        variant="secondary"
                        className="text-teal-700 bg-teal-50 border-teal-200 hover:bg-teal-100"
                        onClick={() => append({ description: "", revenue_account_id: "", tax_rate_id: "", quantity: 1, unit_price: 0 })}
                    >
                        <Icon name="add" className="mr-1" /> Add Line Item
                    </Button>
                </div>

                {/* Footer / Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6">
                        <Field
                            label="Notes"
                            placeholder="Additional notes for the customer..."
                            {...register("notes")}
                        />
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6 flex flex-col gap-3">
                        <div className="flex justify-between text-navy-500 font-semibold">
                            <span>Subtotal</span>
                            <span>{formatIDR(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-navy-500 font-semibold">
                            <span>Tax Total</span>
                            <span>{formatIDR(tax_total)}</span>
                        </div>
                        <div className="border-t border-navy-100 my-1" />
                        <div className="flex justify-between text-navy-900 font-bold text-xl">
                            <span>Total</span>
                            <span>{formatIDR(total)}</span>
                        </div>
                    </div>
                </div>
                
            </div>
        </form>
    )
}
