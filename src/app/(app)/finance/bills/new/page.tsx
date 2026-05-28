"use client"

import { useRouter } from "next/navigation"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { PageHeader } from "@/features/finance/components/page-header"
import { useSession } from "@/features/auth/session-provider"
import { useCreateBill } from "@/features/finance/api-bills"
import { usePartners } from "@/features/finance/api-invoices" // Reusing mock partners
import { useCOA, useTaxRates, type COAAccount } from "@/features/finance/api"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Icon } from "@/components/ui/icon"
import { formatIDR } from "@/lib/format"
import { toast } from "sonner"

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

    // Data dependencies
    const { data: partners = [] } = usePartners(activeCompanyId)
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
            const tax = taxRates.find(t => t.id === parseInt(line.tax_rate_id))
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
            toast.error("Please select a vendor")
            return
        }
        if (data.lines.some(l => !l.expense_account_id)) {
            toast.error("All lines must have an expense account selected")
            return
        }

        // Transform payload to strings as required by the backend API shape
        const apiLines = data.lines.map(l => {
            const lineSub = (l.quantity || 0) * (l.unit_price || 0)
            let tax_amount = 0
            let withholding_amount = 0
            
            if (l.tax_rate_id) {
                const tax = taxRates.find(t => t.id === parseInt(l.tax_rate_id))
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
                toast.success("Bill created successfully")
                router.push(`/finance/bills/${res.data.bill.id}`)
            },
            onError: (err: Error) => {
                toast.error(err?.message || "Failed to create bill")
            }
        })
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-6xl pb-20">
            <PageHeader
                title="New Bill"
                primaryAction={{
                    label: createBill.isPending ? "Creating..." : "Create Bill",
                    onClick: () => {},
                    disabled: createBill.isPending
                }}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-navy-100 p-6">
                    <h2 className="text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
                        <Icon name="storefront" /> Vendor Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Vendor" error={errors.partner_id?.message}>
                            <Controller
                                name="partner_id"
                                control={control}
                                rules={{ required: "Vendor is required" }}
                                render={({ field }) => (
                                    <SearchableSelect
                                        value={field.value}
                                        onChange={(val) => field.onChange(String(val))}
                                        options={partners.map(p => ({ label: p.name, value: String(p.id) }))}
                                        placeholder="Select a vendor..."
                                    />
                                )}
                            />
                        </Field>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6">
                    <h2 className="text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
                        <Icon name="calendar_today" /> Dates
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                        <Field label="Bill Date" error={errors.bill_date?.message}>
                            <input
                                type="date"
                                className="w-full h-10 px-3 rounded-xl border border-navy-200 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow bg-navy-50/30"
                                {...register("bill_date", { required: "Bill date is required" })}
                            />
                        </Field>
                        <Field label="Due Date" error={errors.due_date?.message}>
                            <input
                                type="date"
                                className="w-full h-10 px-3 rounded-xl border border-navy-200 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow bg-navy-50/30"
                                {...register("due_date", { required: "Due date is required" })}
                            />
                        </Field>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6 mb-6 overflow-x-auto">
                <h2 className="text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
                    <Icon name="receipt_long" /> Line Items
                </h2>
                
                <table className="w-full min-w-[800px] text-left border-collapse">
                    <thead>
                        <tr className="border-b border-navy-200 text-sm text-navy-500">
                            <th className="pb-3 font-semibold w-1/4">Description</th>
                            <th className="pb-3 font-semibold px-2 w-1/4">Expense Account</th>
                            <th className="pb-3 font-semibold px-2 w-24">Qty</th>
                            <th className="pb-3 font-semibold px-2 w-32">Unit Price</th>
                            <th className="pb-3 font-semibold px-2 w-32">Tax Rate</th>
                            <th className="pb-3 font-semibold text-right w-32">Amount</th>
                            <th className="pb-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {fields.map((field, index) => {
                            const line = watchedLines[index]
                            const lineSub = (line?.quantity || 0) * (line?.unit_price || 0)
                            let lineAmt = lineSub

                            if (line?.tax_rate_id) {
                                const tax = taxRates.find(t => t.id === parseInt(line.tax_rate_id!))
                                if (tax) {
                                    const taxAmt = lineSub * (parseFloat(tax.rate) / 100)
                                    if (tax.type === 'ppn') lineAmt += taxAmt
                                    if (tax.type === 'pph') lineAmt -= taxAmt
                                }
                            }

                            return (
                                <tr key={field.id} className="border-b border-navy-50 last:border-0 group">
                                    <td className="py-3 pr-2">
                                        <input
                                            type="text"
                                            placeholder="Item description..."
                                            className="w-full h-10 px-3 rounded-lg border border-navy-200 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow bg-white text-sm"
                                            {...register(`lines.${index}.description` as const, { required: true })}
                                        />
                                    </td>
                                    <td className="py-3 px-2">
                                        <Controller
                                            name={`lines.${index}.expense_account_id` as const}
                                            control={control}
                                            render={({ field: { value, onChange } }) => (
                                                <SearchableSelect
                                                    value={value}
                                                    onChange={(val) => onChange(String(val))}
                                                    options={postableAccounts.map(a => ({ label: `${a.code} - ${a.name}`, value: String(a.id) }))}
                                                    placeholder="Account..."
                                                />
                                            )}
                                        />
                                    </td>
                                    <td className="py-3 px-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            className="w-full h-10 px-3 rounded-lg border border-navy-200 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow bg-white text-sm text-right"
                                            {...register(`lines.${index}.quantity` as const, { valueAsNumber: true, required: true })}
                                        />
                                    </td>
                                    <td className="py-3 px-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            className="w-full h-10 px-3 rounded-lg border border-navy-200 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow bg-white text-sm text-right"
                                            {...register(`lines.${index}.unit_price` as const, { valueAsNumber: true, required: true })}
                                        />
                                    </td>
                                    <td className="py-3 px-2">
                                        <select
                                            className="w-full h-10 px-3 rounded-lg border border-navy-200 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow bg-white text-sm"
                                            {...register(`lines.${index}.tax_rate_id` as const)}
                                        >
                                            <option value="">No Tax</option>
                                            {taxRates.map(t => (
                                                <option key={t.id} value={t.id}>{t.name} ({parseFloat(t.rate)}%) - {t.type.toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="py-3 pl-2 text-right font-medium text-navy-900">
                                        {formatIDR(lineAmt)}
                                    </td>
                                    <td className="py-3 pl-2 text-right">
                                        <button
                                            type="button"
                                            onClick={() => remove(index)}
                                            className="p-2 text-navy-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                            tabIndex={-1}
                                        >
                                            <Icon name="delete" />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                <div className="mt-4">
                    <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={() => append({ description: "", expense_account_id: "", quantity: 1, unit_price: 0, tax_rate_id: "" })}
                        className="text-sm font-semibold h-9 px-4 rounded-lg"
                    >
                        + Add Line
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6">
                    <Field label="Notes / Memo">
                        <textarea
                            rows={4}
                            className="w-full p-3 rounded-xl border border-navy-200 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow bg-navy-50/30 resize-none"
                            placeholder="Add any details for internal use..."
                            {...register("notes")}
                        ></textarea>
                    </Field>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6 flex flex-col justify-center">
                    <div className="flex justify-between text-navy-500 mb-3">
                        <span className="font-semibold">Subtotal</span>
                        <span>{formatIDR(subtotal)}</span>
                    </div>
                    {tax_total > 0 && (
                        <div className="flex justify-between text-navy-500 mb-3">
                            <span className="font-semibold">PPN (Value Added Tax)</span>
                            <span className="text-teal-600">+{formatIDR(tax_total)}</span>
                        </div>
                    )}
                    {withholding_total > 0 && (
                        <div className="flex justify-between text-navy-500 mb-3">
                            <span className="font-semibold">PPh (Withholding Tax)</span>
                            <span className="text-rose-600">-{formatIDR(withholding_total)}</span>
                        </div>
                    )}
                    <div className="border-t border-navy-100 my-4" />
                    <div className="flex justify-between text-navy-900">
                        <span className="text-xl font-bold">Total</span>
                        <span className="text-2xl font-bold">{formatIDR(total)}</span>
                    </div>
                </div>
            </div>
            
            {/* Hidden submit button since PageHeader triggers form submit indirectly via native form behavior when it's inside */}
            <button type="submit" className="hidden" />
        </form>
    )
}
