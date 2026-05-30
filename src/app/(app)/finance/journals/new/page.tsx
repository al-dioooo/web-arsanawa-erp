"use client"

import { useRouter } from "next/navigation"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { PageHeader } from "@/features/finance/components/page-header"
import { useSession } from "@/features/auth/session-provider"
import { useCreateJournalEntry } from "@/features/finance/api-journals"
import { useCOA, usePeriods, type COAAccount } from "@/features/finance/api"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputDate } from "@/components/ui/input-date"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Icon } from "@/components/ui/icon"
import { formatIDR } from "@/lib/format"
import { toast } from "sonner"

type JournalLineForm = {
    account_id: string
    description: string
    debit: number
    credit: number
}

type JournalForm = {
    entry_date: string
    description: string
    lines: JournalLineForm[]
}

export default function NewJournalPage() {
    const router = useRouter()
    const { activeCompanyId } = useSession()

    // Data dependencies
    const { data: accounts = [] } = useCOA(activeCompanyId)
    const { data: periods = [] } = usePeriods(activeCompanyId)
    const createJournal = useCreateJournalEntry()

    const { register, control, handleSubmit, watch, formState: { errors } } = useForm<JournalForm>({
        defaultValues: {
            entry_date: new Date().toISOString().split('T')[0],
            description: "",
            lines: [
                { account_id: "", description: "", debit: 0, credit: 0 },
                { account_id: "", description: "", debit: 0, credit: 0 }
            ]
        }
    })

    const { fields, append, remove } = useFieldArray({
        control,
        name: "lines"
    })

    const watchedLines = watch("lines")
    const watchedDate = watch("entry_date")

    // Traverse COA to get all postable accounts
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

    // Find period matching selected date
    const matchedPeriod = periods.find(p => {
        const d = new Date(watchedDate)
        const start = new Date(p.start_date)
        const end = new Date(p.end_date)
        return d >= start && d <= end
    })

    // Calculate totals
    const totalDebit = watchedLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0)
    const totalCredit = watchedLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0)
    const isBalanced = totalDebit === totalCredit && totalDebit > 0
    const difference = Math.abs(totalDebit - totalCredit)

    const onSubmit = (data: JournalForm) => {
        if (!matchedPeriod) {
            toast.error("No accounting period found for the selected date")
            return
        }

        if (data.lines.length < 2) {
            toast.error("A journal entry must have at least 2 lines")
            return
        }

        if (data.lines.some(l => !l.account_id)) {
            toast.error("Please select an account for all lines")
            return
        }

        if (totalDebit !== totalCredit) {
            toast.error(`Journal entry is unbalanced. Debits and Credits must match (Diff: ${formatIDR(difference)})`)
            return
        }

        if (totalDebit <= 0) {
            toast.error("Total Debit/Credit must be greater than 0")
            return
        }

        // Format lines for backend API
        const apiLines = data.lines.map(l => ({
            account_id: parseInt(l.account_id),
            description: l.description || null,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            foreign_debit: Number(l.debit) || 0,
            foreign_credit: Number(l.credit) || 0
        }))

        const payload = {
            entry_date: data.entry_date,
            description: data.description,
            currency_id: 1, // IDR
            exchange_rate: 1.0,
            lines: apiLines
        }

        createJournal.mutate(payload, {
            onSuccess: (res) => {
                toast.success("Journal entry created successfully as Draft")
                if (res.data?.journal_entry?.id) {
                    router.push(`/finance/journals/${res.data.journal_entry.id}`)
                } else {
                    router.push("/finance/journals")
                }
            },
            onError: (err: Error) => {
                toast.error(err?.message || "Failed to create journal entry")
            }
        })
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-6xl pb-20">
            <PageHeader
                title="New Journal Entry"
                primaryAction={{
                    label: createJournal.isPending ? "Creating..." : "Save Draft",
                    onClick: () => {},
                    disabled: createJournal.isPending
                }}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-navy-100 p-6">
                    <h2 className="text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
                        <Icon name="description" /> Entry Details
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                        <Field label="Description / Notes" error={errors.description?.message}>
                            <textarea
                                rows={2}
                                className="w-full p-3 rounded-xl border border-navy-200 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow bg-navy-50/30 resize-none text-sm"
                                placeholder="Write the journal purpose or explanation..."
                                {...register("description", { required: "Description is required", maxLength: 500 })}
                            />
                        </Field>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6 flex flex-col justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
                            <Icon name="calendar_today" /> Date & Period
                        </h2>
                        <InputDate
                            label="Entry Date"
                            error={errors.entry_date?.message}
                            {...register("entry_date", { required: "Date is required" })}
                        />
                    </div>

                    <div className="mt-3 p-3 rounded-xl bg-navy-50/50 border border-navy-100 text-xs flex items-center gap-2">
                        <Icon name="info" className="text-teal-600" />
                        <div>
                            <span className="font-semibold text-navy-500">Period:</span>{" "}
                            <span className="font-bold text-navy-700">
                                {matchedPeriod ? matchedPeriod.name : "No matching period found"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-6 mb-6 overflow-x-auto">
                <h2 className="text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
                    <Icon name="format_list_bulleted" /> Journal Lines
                </h2>

                <table className="w-full min-w-[700px] text-left border-collapse">
                    <thead>
                        <tr className="border-b border-navy-200 text-sm text-navy-500">
                            <th className="pb-3 font-semibold w-1/3">Account</th>
                            <th className="pb-3 font-semibold px-2 w-1/3">Description</th>
                            <th className="pb-3 font-semibold px-2 w-28 text-right">Debit</th>
                            <th className="pb-3 font-semibold px-2 w-28 text-right">Credit</th>
                            <th className="pb-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {fields.map((field, index) => (
                            <tr key={field.id} className="border-b border-navy-50 last:border-0 group">
                                <td className="py-3 pr-2">
                                    <Controller
                                        name={`lines.${index}.account_id` as const}
                                        control={control}
                                        render={({ field: { value, onChange } }) => (
                                            <SearchableSelect
                                                value={value}
                                                onChange={(val) => onChange(String(val))}
                                                options={postableAccounts.map(a => ({ label: `${a.code} - ${a.name}`, value: String(a.id) }))}
                                                placeholder="Select Account..."
                                            />
                                        )}
                                    />
                                </td>
                                <td className="py-3 px-2">
                                    <Input
                                        label={`Line ${index + 1} description`}
                                        hideLabel
                                        type="text"
                                        placeholder="Line description (optional)..."
                                        {...register(`lines.${index}.description` as const)}
                                    />
                                </td>
                                <td className="py-3 px-2">
                                    <Input
                                        label={`Line ${index + 1} debit`}
                                        hideLabel
                                        type="number"
                                        min="0"
                                        step="any"
                                        className="text-right"
                                        {...register(`lines.${index}.debit` as const, { valueAsNumber: true })}
                                    />
                                </td>
                                <td className="py-3 px-2">
                                    <Input
                                        label={`Line ${index + 1} credit`}
                                        hideLabel
                                        type="number"
                                        min="0"
                                        step="any"
                                        className="text-right"
                                        {...register(`lines.${index}.credit` as const, { valueAsNumber: true })}
                                    />
                                </td>
                                <td className="py-3 pl-2 text-right">
                                    {fields.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => remove(index)}
                                            className="p-2 text-navy-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                            tabIndex={-1}
                                        >
                                            <Icon name="delete" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-4 flex justify-between items-center">
                    <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={() => append({ account_id: "", description: "", debit: 0, credit: 0 })}
                        className="text-sm font-semibold h-9 px-4 rounded-lg"
                    >
                        + Add Line
                    </Button>

                    <div className="flex gap-4 items-center">
                        <div className="text-right">
                            <span className="text-xs text-navy-400 font-semibold uppercase block">Total Debit</span>
                            <span className="text-sm font-bold text-navy-800">{formatIDR(totalDebit)}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-navy-400 font-semibold uppercase block">Total Credit</span>
                            <span className="text-sm font-bold text-navy-800">{formatIDR(totalCredit)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-colors ${
                isBalanced 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                    : "bg-amber-50 border-amber-100 text-amber-800"
            }`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isBalanced ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                        <Icon name={isBalanced ? "check_circle" : "warning"} className="text-lg" />
                    </div>
                    <div>
                        <p className="font-bold text-sm">
                            {isBalanced ? "Journal Entry Balanced" : "Journal Entry Unbalanced"}
                        </p>
                        <p className="text-xs opacity-90">
                            {isBalanced 
                                ? "Everything is set! You can save this journal entry as a draft."
                                : totalDebit === 0 
                                    ? "Add debit and credit values greater than 0." 
                                    : `Debit total must equal Credit total. Current difference is ${formatIDR(difference)}.`
                            }
                        </p>
                    </div>
                </div>
            </div>

            <button type="submit" className="hidden" />
        </form>
    )
}
