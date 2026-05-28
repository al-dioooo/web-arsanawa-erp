"use client"

import { useState } from "react"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { useSession } from "@/features/auth/session-provider"
import { useTaxRates, useCreateTaxRate } from "@/features/finance/api"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { useForm, Controller } from "react-hook-form"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type TaxRateFormData = {
    name: string
    type: "ppn" | "pph"
    rate: string
}

export default function TaxRatesPage() {
    const { activeCompanyId } = useSession()
    const { data: taxRates = [], isLoading } = useTaxRates(activeCompanyId)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<"ppn" | "pph">("ppn")

    const filteredRates = taxRates.filter(rate => rate.type === activeTab)

    return (
        <div className="w-full">
            <PageHeader
                title="Tax Rates"
                primaryAction={{
                    label: "+ New Tax Rate",
                    onClick: () => setIsDrawerOpen(true)
                }}
            />

            <FilterBar>
                <div className="flex-1 text-sm text-navy-500">
                    Manage tax rates used for generating invoices and bills.
                </div>
            </FilterBar>

            <div className="mb-4 border-b border-navy-100 flex gap-4">
                <button
                    onClick={() => setActiveTab("ppn")}
                    className={cn(
                        "py-2 px-1 border-b-2 font-semibold text-sm transition-colors cursor-pointer",
                        activeTab === "ppn" ? "border-teal-600 text-teal-700" : "border-transparent text-navy-500 hover:text-navy-700"
                    )}
                >
                    PPN (Value Added Tax)
                </button>
                <button
                    onClick={() => setActiveTab("pph")}
                    className={cn(
                        "py-2 px-1 border-b-2 font-semibold text-sm transition-colors cursor-pointer",
                        activeTab === "pph" ? "border-teal-600 text-teal-700" : "border-transparent text-navy-500 hover:text-navy-700"
                    )}
                >
                    PPh (Income Tax)
                </button>
            </div>

            <DataTable columns={["Tax Name", "Type", "Rate (%)", "Status"]}>
                {isLoading && (
                    <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-navy-500">
                            Loading tax rates...
                        </td>
                    </tr>
                )}
                {!isLoading && filteredRates.length === 0 && (
                    <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-navy-500">
                            No {activeTab.toUpperCase()} tax rates found.
                        </td>
                    </tr>
                )}
                {filteredRates.map((rate) => (
                    <tr key={rate.id} className="hover:bg-navy-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-navy-900">{rate.name}</td>
                        <td className="px-6 py-4 text-navy-700 uppercase font-mono text-sm">{rate.type}</td>
                        <td className="px-6 py-4 text-navy-900 font-bold">{parseFloat(rate.rate).toString()}%</td>
                        <td className="px-6 py-4">
                            <StatusBadge status={rate.is_active ? 'active' : 'inactive'} />
                        </td>
                    </tr>
                ))}
            </DataTable>

            {isDrawerOpen && (
                <TaxRateDrawer 
                    onClose={() => setIsDrawerOpen(false)} 
                />
            )}
        </div>
    )
}

function TaxRateDrawer({ onClose }: { onClose: () => void }) {
    const { activeCompanyId } = useSession()
    const createTaxRate = useCreateTaxRate()
    
    const { register, handleSubmit, control, formState: { errors } } = useForm<TaxRateFormData>({
        defaultValues: {
            name: "",
            type: "ppn",
            rate: "0.00"
        }
    })

    const onSubmit = (data: TaxRateFormData) => {
        if (!activeCompanyId) return

        createTaxRate.mutate({
            company_id: activeCompanyId,
            name: data.name,
            type: data.type,
            rate: data.rate,
            is_active: true
        }, {
            onSuccess: () => {
                toast.success("Tax rate created successfully")
                onClose()
            },
            onError: (err: Error) => {
                toast.error(err?.message || "Failed to create tax rate")
            }
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy-900/40 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100">
                    <h2 className="text-lg font-bold text-navy-900">New Tax Rate</h2>
                    <button onClick={onClose} className="p-2 text-navy-400 hover:text-navy-700 hover:bg-navy-50 rounded-full transition-colors cursor-pointer">
                        <Icon name="close" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                    <Field
                        label="Tax Name"
                        placeholder="e.g. PPN 11%, PPh 23"
                        {...register("name", { required: "Name is required" })}
                        error={errors.name?.message}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Controller
                            name="type"
                            control={control}
                            render={({ field }) => (
                                <SearchableSelect
                                    label="Tax Type"
                                    options={[
                                        { value: "ppn", label: "PPN" },
                                        { value: "pph", label: "PPh" },
                                    ]}
                                    value={field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        />
                        
                        <Field
                            label="Rate (%)"
                            type="number"
                            step="0.01"
                            {...register("rate", { 
                                required: "Rate is required",
                                min: { value: 0, message: "Rate cannot be negative" }
                            })}
                            error={errors.rate?.message}
                        />
                    </div>
                </form>

                <div className="p-6 border-t border-navy-100 bg-navy-50/50 flex gap-3 justify-end">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit(onSubmit)} disabled={createTaxRate.isPending} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
                        {createTaxRate.isPending ? "Saving..." : "Save Tax Rate"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
