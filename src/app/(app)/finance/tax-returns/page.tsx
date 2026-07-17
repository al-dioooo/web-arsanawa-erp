"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { useSession } from "@/features/auth/session-provider"
import { useTaxReturns, useGenerateTaxReturn, type TaxReturn } from "@/features/finance/api-tax-returns"
import { EnterTransition } from "@/components/ui/enter"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { InputDate } from "@/components/ui/input-date"
import { SelectDescription } from "@/components/ui/select-description"
import { formatIDR, formatDateID } from "@/lib/format"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useForm } from "react-hook-form"

type GenerateForm = {
    tax_type: 'ppn' | 'pph23'
    period_start: string
    period_end: string
}

const TAX_TYPE_LABEL: Record<string, string> = {
    ppn: 'PPN (Value Added Tax)',
    pph23: 'PPh 23 (Withholding Tax)',
}

export default function TaxReturnsPage() {
    const router = useRouter()
    const { activeCompanyId } = useSession()
    const { data: taxReturns = [], isLoading } = useTaxReturns(activeCompanyId)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'all' | 'ppn' | 'pph23'>('all')

    const filtered = activeTab === 'all' ? taxReturns : taxReturns.filter(r => r.tax_type === activeTab)

    return (
        <div className="w-full">
            <PageHeader
                title="Tax Returns (SPT)"
                primaryAction={{
                    label: "+ Generate Return",
                    onClick: () => setIsDrawerOpen(true),
                }}
            />

            <FilterBar>
                <div className="flex-1 text-sm text-navy-500">
                    Generate and file tax returns (SPT) for PPN and PPh 23. Returns are computed from posted transactions.
                </div>
            </FilterBar>

            {/* Summary KPI row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {(['all', 'ppn', 'pph23'] as const).map(type => {
                    const subset = type === 'all' ? taxReturns : taxReturns.filter(r => r.tax_type === type)
                    const draftCount = subset.filter(r => r.status === 'draft').length
                    const total = subset.reduce((s, r) => s + parseFloat(r.total_payable), 0)
                    return (
                        <button
                            key={type}
                            onClick={() => setActiveTab(type)}
                            className={cn(
                                "bg-white rounded-2xl border p-5 text-left shadow-sm transition-all cursor-pointer",
                                activeTab === type ? "border-teal-500 ring-2 ring-teal-500/20" : "border-navy-100 hover:border-teal-300"
                            )}
                        >
                            <div className="text-xs font-bold uppercase tracking-wider text-navy-400 mb-1">
                                {type === 'all' ? 'All Returns' : TAX_TYPE_LABEL[type]}
                            </div>
                            <div className="text-2xl font-bold text-navy-900 mb-1">{formatIDR(total)}</div>
                            <div className="text-sm text-navy-500">{subset.length} total · {draftCount} draft</div>
                        </button>
                    )
                })}
            </div>

            {/* Tab filter */}
            <div className="mb-4 border-b border-navy-100 flex gap-4">
                {(['all', 'ppn', 'pph23'] as const).map(type => (
                    <button
                        key={type}
                        onClick={() => setActiveTab(type)}
                        className={cn(
                            "py-2 px-1 border-b-2 font-semibold text-sm transition-colors cursor-pointer",
                            activeTab === type
                                ? "border-teal-600 text-teal-700"
                                : "border-transparent text-navy-500 hover:text-navy-700"
                        )}
                    >
                        {type === 'all' ? 'All' : type.toUpperCase()}
                    </button>
                ))}
            </div>

            <DataTable columns={["Period", "Tax Type", "Output Tax", "Input Tax", "Net Payable", "Status", ""]}>
                {isLoading && (
                    <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-navy-500">
                            Loading tax returns...
                        </td>
                    </tr>
                )}
                {!isLoading && filtered.length === 0 && (
                    <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center gap-2">
                                <div className="p-4 bg-navy-50 rounded-2xl">
                                    <Icon name="description" className="text-4xl text-navy-300" />
                                </div>
                                <p className="font-semibold text-navy-700">No tax returns found</p>
                                <p className="text-sm text-navy-400">Click &quot;Generate Return&quot; to create a new SPT.</p>
                            </div>
                        </td>
                    </tr>
                )}
                {filtered.map((ret) => (
                    <TaxReturnRow key={ret.id} ret={ret} onClick={() => router.push(`/finance/tax-returns/${ret.id}`)} />
                ))}
            </DataTable>

            {isDrawerOpen && (
                <GenerateReturnDrawer onClose={() => setIsDrawerOpen(false)} companyId={activeCompanyId} />
            )}
        </div>
    )
}

function TaxReturnRow({ ret, onClick }: { ret: TaxReturn; onClick: () => void }) {
    const output = parseFloat(ret.total_output)
    const input = parseFloat(ret.total_input)
    const payable = parseFloat(ret.total_payable)

    return (
        <tr
            onClick={onClick}
            className="hover:bg-navy-50/50 transition-colors cursor-pointer"
        >
            <td className="px-6 py-4">
                <div className="font-semibold text-navy-900">{formatDateID(ret.period_start)}</div>
                <div className="text-xs text-navy-400">to {formatDateID(ret.period_end)}</div>
            </td>
            <td className="px-6 py-4">
                <span className={cn(
                    "inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                    ret.tax_type === 'ppn'
                        ? "bg-teal-50 text-teal-700"
                        : "bg-indigo-50 text-indigo-700"
                )}>
                    {ret.tax_type === 'ppn' ? 'PPN' : 'PPh 23'}
                </span>
            </td>
            <td className="px-6 py-4 text-navy-700 text-right font-medium">{formatIDR(output)}</td>
            <td className="px-6 py-4 text-navy-700 text-right font-medium">{formatIDR(input)}</td>
            <td className={cn("px-6 py-4 text-right font-bold", payable > 0 ? "text-rose-600" : "text-teal-600")}>
                {formatIDR(payable)}
            </td>
            <td className="px-6 py-4">
                <StatusBadge status={ret.status} />
            </td>
            <td className="px-6 py-4 text-navy-400">
                <Icon name="chevron_right" className="text-lg" />
            </td>
        </tr>
    )
}

function GenerateReturnDrawer({ onClose, companyId }: { onClose: () => void; companyId: number | null }) {
    const generateReturn = useGenerateTaxReturn()
    const router = useRouter()

    const thisMonth = new Date()
    const firstDay = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString().split('T')[0]
    const lastDay = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0).toISOString().split('T')[0]

    const { register, handleSubmit, watch, formState: { errors } } = useForm<GenerateForm>({
        defaultValues: {
            tax_type: 'ppn',
            period_start: firstDay,
            period_end: lastDay,
        },
    })
    const taxType = watch("tax_type")

    const onSubmit = (data: GenerateForm) => {
        if (!companyId) return
        generateReturn.mutate(data, {
            onSuccess: (res) => {
                toast.success("Tax return generated successfully")
                onClose()
                if (res.data?.tax_return?.id) {
                    router.push(`/finance/tax-returns/${res.data.tax_return.id}`)
                }
            },
            onError: (err: Error) => {
                toast.error(err?.message || "Failed to generate tax return")
            },
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy-900/40 backdrop-blur-sm">
            <EnterTransition from="right" distance="100%" fade={false} duration={0.2} className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100">
                    <div>
                        <h2 className="text-lg font-bold text-navy-900">Generate Tax Return</h2>
                        <p className="text-sm text-navy-500 mt-0.5">Compute SPT from posted transactions</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-navy-400 hover:text-navy-700 hover:bg-navy-50 rounded-full transition-colors cursor-pointer">
                        <Icon name="close" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                    <SelectDescription
                        label="Tax Type"
                        error={errors.tax_type?.message}
                        value={taxType}
                        options={[
                            { value: "ppn", label: "PPN", description: "Value Added Tax return for taxable sales and purchases." },
                            { value: "pph23", label: "PPh 23", description: "Withholding Tax return for applicable vendor payments." },
                        ]}
                        {...register("tax_type", { required: "Tax type is required" })}
                    />

                    <div className="bg-navy-50/60 rounded-xl p-4 border border-navy-100">
                        <p className="text-sm font-semibold text-navy-700 mb-3 flex items-center gap-2">
                            <Icon name="calendar_month" className="text-base text-navy-400" />
                            Reporting Period
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <InputDate
                                label="Period Start"
                                error={errors.period_start?.message}
                                {...register("period_start", { required: "Start date is required" })}
                            />
                            <InputDate
                                label="Period End"
                                error={errors.period_end?.message}
                                {...register("period_end", { required: "End date is required" })}
                            />
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                        <div className="flex gap-2">
                            <Icon name="info" className="text-base text-amber-600 flex-shrink-0 mt-0.5" />
                            <p>The system will scan all posted invoices and bills within the selected date range and compute the tax totals automatically.</p>
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-navy-100 bg-navy-50/50 flex gap-3 justify-end">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleSubmit(onSubmit)}
                        disabled={generateReturn.isPending}
                        className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                    >
                        {generateReturn.isPending ? "Generating..." : "Generate Return"}
                    </Button>
                </div>
            </EnterTransition>
        </div>
    )
}
