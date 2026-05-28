"use client"

import { useState } from "react"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { useSession } from "@/features/auth/session-provider"
import { usePeriods, useCreatePeriod, useClosePeriod, useReopenPeriod } from "@/features/finance/api"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { DatePicker } from "@/components/ui/date-picker"
import { useForm, Controller } from "react-hook-form"
import { toast } from "sonner"
import { formatDateID } from "@/lib/format"

type PeriodFormData = {
    name: string
    start_date: string
    end_date: string
}

export default function PeriodsPage() {
    const { activeCompanyId } = useSession()
    const { data: periods = [], isLoading } = usePeriods(activeCompanyId)
    const closePeriod = useClosePeriod()
    const reopenPeriod = useReopenPeriod()

    const [isDrawerOpen, setIsDrawerOpen] = useState(false)

    const handleClose = (id: number) => {
        if (confirm("Are you sure you want to close this accounting period?")) {
            closePeriod.mutate(id, {
                onSuccess: () => toast.success("Period closed successfully"),
                onError: (err: Error) => toast.error(err?.message || "Failed to close period")
            })
        }
    }

    const handleReopen = (id: number) => {
        if (confirm("Are you sure you want to reopen this accounting period?")) {
            reopenPeriod.mutate(id, {
                onSuccess: () => toast.success("Period reopened successfully"),
                onError: (err: Error) => toast.error(err?.message || "Failed to reopen period")
            })
        }
    }

    return (
        <div className="w-full">
            <PageHeader
                title="Accounting Periods"
                primaryAction={{
                    label: "+ New Period",
                    onClick: () => setIsDrawerOpen(true)
                }}
            />

            <FilterBar>
                <div className="flex-1 text-sm text-navy-500">
                    Manage your financial accounting periods. Close periods to prevent further postings.
                </div>
            </FilterBar>

            <DataTable columns={["Period Name", "Start Date", "End Date", "Closed At", "Status", "Actions"]}>
                {isLoading && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-navy-500">
                            Loading periods...
                        </td>
                    </tr>
                )}
                {!isLoading && periods.length === 0 && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-navy-500">
                            No accounting periods found.
                        </td>
                    </tr>
                )}
                {periods.map((period) => (
                    <tr key={period.id} className="hover:bg-navy-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-navy-900">{period.name}</td>
                        <td className="px-6 py-4 text-navy-700">{formatDateID(period.start_date)}</td>
                        <td className="px-6 py-4 text-navy-700">{formatDateID(period.end_date)}</td>
                        <td className="px-6 py-4 text-navy-700">
                            {period.closed_at ? formatDateID(period.closed_at) : "-"}
                        </td>
                        <td className="px-6 py-4">
                            <StatusBadge status={period.status === 'open' ? 'active' : 'closed'} />
                        </td>
                        <td className="px-6 py-4">
                            {period.status === 'open' ? (
                                <button 
                                    onClick={() => handleClose(period.id)}
                                    className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                >
                                    Close Period
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleReopen(period.id)}
                                    className="text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                >
                                    Reopen
                                </button>
                            )}
                        </td>
                    </tr>
                ))}
            </DataTable>

            {isDrawerOpen && (
                <PeriodDrawer 
                    onClose={() => setIsDrawerOpen(false)} 
                />
            )}
        </div>
    )
}

function PeriodDrawer({ onClose }: { onClose: () => void }) {
    const { activeCompanyId } = useSession()
    const createPeriod = useCreatePeriod()
    
    const { register, handleSubmit, control, formState: { errors } } = useForm<PeriodFormData>({
        defaultValues: {
            name: "",
            start_date: "",
            end_date: ""
        }
    })

    const onSubmit = (data: PeriodFormData) => {
        if (!activeCompanyId) return

        createPeriod.mutate({
            company_id: activeCompanyId,
            name: data.name,
            start_date: data.start_date,
            end_date: data.end_date,
            status: 'open'
        }, {
            onSuccess: () => {
                toast.success("Period created successfully")
                onClose()
            },
            onError: (err: Error) => {
                toast.error(err?.message || "Failed to create period. Make sure dates do not overlap with existing periods.")
            }
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy-900/40 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100">
                    <h2 className="text-lg font-bold text-navy-900">New Accounting Period</h2>
                    <button onClick={onClose} className="p-2 text-navy-400 hover:text-navy-700 hover:bg-navy-50 rounded-full transition-colors cursor-pointer">
                        <Icon name="close" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                    <Field
                        label="Period Name"
                        placeholder="e.g. FY2026-Q1, May 2026"
                        {...register("name", { required: "Name is required" })}
                        error={errors.name?.message}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Controller
                            name="start_date"
                            control={control}
                            rules={{ required: "Start date is required" }}
                            render={({ field }) => (
                                <DatePicker
                                    label="Start Date"
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors.start_date?.message}
                                />
                            )}
                        />

                        <Controller
                            name="end_date"
                            control={control}
                            rules={{ required: "End date is required" }}
                            render={({ field }) => (
                                <DatePicker
                                    label="End Date"
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors.end_date?.message}
                                />
                            )}
                        />
                    </div>
                </form>

                <div className="p-6 border-t border-navy-100 bg-navy-50/50 flex gap-3 justify-end">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit(onSubmit)} disabled={createPeriod.isPending} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
                        {createPeriod.isPending ? "Saving..." : "Save Period"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
