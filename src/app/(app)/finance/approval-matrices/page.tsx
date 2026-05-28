"use client"

import { useState } from "react"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { useSession } from "@/features/auth/session-provider"
import { useApprovalMatrices, useCreateApprovalMatrix, useUpdateApprovalMatrix, useDeleteApprovalMatrix, useCompanyMembers, type ApprovalMatrix } from "@/features/finance/api-approvals"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { useForm, Controller } from "react-hook-form"
import { toast } from "sonner"
import { formatIDR } from "@/lib/format"
import { cn } from "@/lib/utils"

type ApprovalMatrixFormData = {
    document_type: "bill" | "payment"
    min_amount: string
    max_amount: string
    level: number
    approver_user_id: number
}

export default function ApprovalMatricesPage() {
    const { activeCompanyId } = useSession()
    const { data: matrices = [], isLoading } = useApprovalMatrices(activeCompanyId)
    const deleteMatrix = useDeleteMatrixRule()
    
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [editingRule, setEditingRule] = useState<ApprovalMatrix | null>(null)
    const [activeTab, setActiveTab] = useState<"bill" | "payment">("bill")

    const filteredRules = matrices
        .filter(rule => rule.document_type === activeTab)
        .sort((a, b) => {
            const minA = parseFloat(a.min_amount)
            const minB = parseFloat(b.min_amount)
            if (minA !== minB) return minA - minB
            return a.level - b.level
        })

    const handleEdit = (rule: ApprovalMatrix) => {
        setEditingRule(rule)
        setIsDrawerOpen(true)
    }

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this approval rule?")) {
            deleteMatrix.mutate(id, {
                onSuccess: () => toast.success("Approval rule deleted successfully"),
                onError: (err: Error) => toast.error(err?.message || "Failed to delete rule")
            })
        }
    }

    return (
        <div className="w-full">
            <PageHeader
                title="Matriks Persetujuan (Approval Matrix)"
                primaryAction={{
                    label: "+ Add Approval Rule",
                    onClick: () => {
                        setEditingRule(null)
                        setIsDrawerOpen(true)
                    }
                }}
            />

            <FilterBar>
                <div className="flex-1 text-sm text-navy-500 font-body">
                    Configure multi-level, value-banded approval rules for invoices/bills and payments.
                </div>
            </FilterBar>

            <div className="mb-4 border-b border-navy-100 flex gap-4">
                <button
                    onClick={() => setActiveTab("bill")}
                    className={cn(
                        "py-2 px-1 border-b-2 font-semibold text-sm transition-colors cursor-pointer",
                        activeTab === "bill" ? "border-teal-600 text-teal-700" : "border-transparent text-navy-500 hover:text-navy-700"
                    )}
                >
                    Bills & Inbound Invoices
                </button>
                <button
                    onClick={() => setActiveTab("payment")}
                    className={cn(
                        "py-2 px-1 border-b-2 font-semibold text-sm transition-colors cursor-pointer",
                        activeTab === "payment" ? "border-teal-600 text-teal-700" : "border-transparent text-navy-500 hover:text-navy-700"
                    )}
                >
                    Payments & Outbound Receipts
                </button>
            </div>

            <DataTable columns={["Level", "Min Amount", "Max Amount", "Approver Name", "Actions"]}>
                {isLoading && (
                    <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-navy-500">
                            Loading approval rules...
                        </td>
                    </tr>
                )}
                {!isLoading && filteredRules.length === 0 && (
                    <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-navy-500">
                            No approval rules configured for {activeTab === "bill" ? "Bills" : "Payments"}.
                        </td>
                    </tr>
                )}
                {filteredRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-navy-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-navy-900">
                            Level {rule.level}
                        </td>
                        <td className="px-6 py-4 text-navy-700 font-semibold">
                            {formatIDR(parseFloat(rule.min_amount))}
                        </td>
                        <td className="px-6 py-4 text-navy-700 font-semibold">
                            {formatIDR(parseFloat(rule.max_amount))}
                        </td>
                        <td className="px-6 py-4 text-navy-900 font-medium">
                            <ApproverName userId={rule.approver_user_id} />
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(rule)}
                                    className="p-1.5 text-navy-500 hover:text-teal-600 hover:bg-navy-50 rounded-lg transition-colors cursor-pointer"
                                    title="Edit Rule"
                                >
                                    <Icon name="edit" className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(rule.id)}
                                    className="p-1.5 text-navy-500 hover:text-rose-600 hover:bg-navy-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Rule"
                                >
                                    <Icon name="delete" className="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </DataTable>

            {isDrawerOpen && (
                <ApprovalRuleDrawer 
                    rule={editingRule}
                    defaultDocType={activeTab}
                    onClose={() => {
                        setIsDrawerOpen(false)
                        setEditingRule(null)
                    }} 
                />
            )}
        </div>
    )
}

function useDeleteMatrixRule() {
    return useDeleteApprovalMatrix()
}

function ApproverName({ userId }: { userId: number }) {
    const { activeCompanyId } = useSession()
    const { data: memberships = [] } = useCompanyMembers(activeCompanyId)
    const membership = memberships.find(m => m.user_id === userId)
    if (!membership?.user) {
        return <span className="text-navy-400">User ID #{userId}</span>
    }
    return <span>{membership.user.name} <span className="text-xs text-navy-400">({membership.role})</span></span>
}

function ApprovalRuleDrawer({ rule, defaultDocType, onClose }: { rule: ApprovalMatrix | null, defaultDocType: "bill" | "payment", onClose: () => void }) {
    const { activeCompanyId } = useSession()
    const createRule = useCreateApprovalMatrix()
    const updateRule = useUpdateApprovalMatrix()
    const { data: memberships = [] } = useCompanyMembers(activeCompanyId)

    const memberOptions = memberships
        .filter(m => m.status === 'active' && m.user)
        .map(m => ({
            value: m.user_id,
            label: `${m.user?.name || `User #${m.user_id}`} (${m.role})`
        }))
    
    const { register, handleSubmit, control, formState: { errors } } = useForm<ApprovalMatrixFormData>({
        defaultValues: rule ? {
            document_type: rule.document_type,
            min_amount: parseFloat(rule.min_amount).toString(),
            max_amount: parseFloat(rule.max_amount).toString(),
            level: rule.level,
            approver_user_id: rule.approver_user_id
        } : {
            document_type: defaultDocType,
            min_amount: "0.00",
            max_amount: "1000000.00",
            level: 1,
            approver_user_id: memberOptions[0]?.value || 0
        }
    })

    const onSubmit = (data: ApprovalMatrixFormData) => {
        if (!activeCompanyId) return

        const payload = {
            company_id: activeCompanyId,
            document_type: data.document_type,
            min_amount: data.min_amount,
            max_amount: data.max_amount,
            level: Number(data.level),
            approver_user_id: Number(data.approver_user_id)
        }

        const mutateOptions = {
            onSuccess: () => {
                toast.success(rule ? "Approval rule updated successfully" : "Approval rule created successfully")
                onClose()
            },
            onError: (err: Error) => {
                toast.error(err?.message || "Failed to save approval rule")
            }
        }

        if (rule) {
            updateRule.mutate({ id: rule.id, ...payload }, mutateOptions)
        } else {
            createRule.mutate(payload, mutateOptions)
        }
    }

    const isPending = createRule.isPending || updateRule.isPending

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy-900/40 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100">
                    <h2 className="text-lg font-bold text-navy-900">
                        {rule ? "Edit Approval Rule" : "New Approval Rule"}
                    </h2>
                    <button onClick={onClose} className="p-2 text-navy-400 hover:text-navy-700 hover:bg-navy-50 rounded-full transition-colors cursor-pointer">
                        <Icon name="close" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                    <Controller
                        name="document_type"
                        control={control}
                        render={({ field }) => (
                            <SearchableSelect
                                label="Document Type"
                                options={[
                                    { value: "bill", label: "Bill / Inbound Invoice" },
                                    { value: "payment", label: "Payment / Outbound Receipt" },
                                ]}
                                value={field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="Min Amount"
                            type="number"
                            step="0.01"
                            {...register("min_amount", { 
                                required: "Min Amount is required",
                                min: { value: 0, message: "Min amount cannot be negative" }
                            })}
                            error={errors.min_amount?.message}
                        />
                        
                        <Field
                            label="Max Amount"
                            type="number"
                            step="0.01"
                            {...register("max_amount", { 
                                required: "Max Amount is required",
                                validate: (val, formVals) => 
                                    parseFloat(val) >= parseFloat(formVals.min_amount) || "Max Amount must be >= Min Amount"
                            })}
                            error={errors.max_amount?.message}
                        />
                    </div>

                    <Field
                        label="Approval Level (Seq. Tier)"
                        type="number"
                        min="1"
                        step="1"
                        {...register("level", { 
                            required: "Level is required",
                            min: { value: 1, message: "Level must be >= 1" }
                        })}
                        error={errors.level?.message}
                    />

                    <Controller
                        name="approver_user_id"
                        control={control}
                        rules={{ required: "Approver is required" }}
                        render={({ field }) => (
                            <SearchableSelect
                                label="Designated Approver"
                                options={memberOptions}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select a company member..."
                            />
                        )}
                    />
                </form>

                <div className="p-6 border-t border-navy-100 bg-navy-50/50 flex gap-3 justify-end">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit(onSubmit)} disabled={isPending} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
                        {isPending ? "Saving..." : rule ? "Save Changes" : "Create Rule"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
