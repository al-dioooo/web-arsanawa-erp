"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { DataTable } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { Icon } from "@/components/ui/icon"
import { Modal } from "@/components/ui/modal"
import { PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { TableStateRow } from "@/components/ui/table-state-row"
import { Tooltip } from "@/components/ui/tooltip"
import { useSession } from "@/features/auth/session-provider"
import { useApprovalMatrices, useCreateApprovalMatrix, useUpdateApprovalMatrix, useDeleteApprovalMatrix, useCompanyMembers, type ApprovalMatrix } from "@/features/finance/api-approvals"
import { formatIDR } from "@/lib/format"
import { cn } from "@/lib/utils"

type ApprovalMatrixFormData = {
    document_type: "bill" | "payment"
    min_amount: string
    max_amount: string
    level: number
    approver_user_id: number
}

const TABS = ["bill", "payment"] as const

export default function ApprovalMatricesPage() {
    const t = useTranslations("finance.approvals.matrices")
    const tCommon = useTranslations("common")
    const { activeCompanyId } = useSession()
    const { data: matrices = [], isLoading } = useApprovalMatrices(activeCompanyId)
    const deleteMatrix = useDeleteMatrixRule()
    const [confirm, confirmDialog] = useConfirm()

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

    const handleDelete = async (id: number) => {
        const ok = await confirm({
            title: t("deleteConfirm.title"),
            message: t("deleteConfirm.message"),
            confirmLabel: tCommon("delete"),
            cancelLabel: tCommon("cancel"),
            danger: true,
        })
        if (ok) {
            deleteMatrix.mutate(id, {
                onSuccess: () => toast.success(t("toast.deleted")),
                onError: (err: Error) => toast.error(err?.message || t("toast.deleteFailed"))
            })
        }
    }

    return (
        <div className="w-full">
            <PageHeader
                eyebrow={t("eyebrow")}
                title={t("title")}
                subtitle={t("subtitle")}
                actions={
                    <Button
                        size="lg"
                        onClick={() => {
                            setEditingRule(null)
                            setIsDrawerOpen(true)
                        }}
                    >
                        {t("addRule")}
                    </Button>
                }
            />

            <div className="mb-4 flex gap-4 border-b border-line">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "cursor-pointer border-b-2 px-1 py-2 text-sm font-semibold transition-colors",
                            activeTab === tab
                                ? "border-brand text-brand-ink"
                                : "border-transparent text-ink-muted hover:text-ink"
                        )}
                    >
                        {t(`tabs.${tab}`)}
                    </button>
                ))}
            </div>

            <DataTable
                columns={[
                    t("table.level"),
                    t("table.minAmount"),
                    t("table.maxAmount"),
                    t("table.approver"),
                    t("table.actions"),
                ]}
            >
                <TableStateRow
                    isLoading={isLoading}
                    count={filteredRules.length}
                    columns={5}
                    emptyMessage={t("empty", {
                        type: t(activeTab === "bill" ? "docTypeBill" : "docTypePayment"),
                    })}
                />
                {filteredRules.map((rule) => (
                    <tr key={rule.id}>
                        <td className="font-mono font-bold text-ink">
                            {t("level", { level: rule.level })}
                        </td>
                        <td className="font-semibold text-ink-secondary">
                            {formatIDR(parseFloat(rule.min_amount))}
                        </td>
                        <td className="font-semibold text-ink-secondary">
                            {formatIDR(parseFloat(rule.max_amount))}
                        </td>
                        <td className="font-medium text-ink">
                            <ApproverName userId={rule.approver_user_id} />
                        </td>
                        <td>
                            <div className="flex gap-2">
                                <Tooltip label={t("actions.edit")}>
                                    <Button
                                        type="button"
                                        size="icon-sm"
                                        variant="ghost"
                                        aria-label={t("actions.edit")}
                                        onClick={() => handleEdit(rule)}
                                    >
                                        <Icon name="edit" className="h-4 w-4" />
                                    </Button>
                                </Tooltip>
                                <Tooltip label={t("actions.delete")}>
                                    <Button
                                        type="button"
                                        size="icon-sm"
                                        variant="ghost"
                                        aria-label={t("actions.delete")}
                                        onClick={() => void handleDelete(rule.id)}
                                    >
                                        <Icon name="delete" className="h-4 w-4" />
                                    </Button>
                                </Tooltip>
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
            {confirmDialog}
        </div>
    )
}

function useDeleteMatrixRule() {
    return useDeleteApprovalMatrix()
}

function ApproverName({ userId }: { userId: number }) {
    const t = useTranslations("finance.approvals.matrices")
    const { activeCompanyId } = useSession()
    const { data: memberships = [] } = useCompanyMembers(activeCompanyId)
    const membership = memberships.find(m => m.user_id === userId)
    if (!membership?.user) {
        return <span className="text-ink-faint">{t("userFallback", { id: userId })}</span>
    }
    return <span>{membership.user.name} <span className="text-xs text-ink-faint">({membership.role})</span></span>
}

function ApprovalRuleDrawer({ rule, defaultDocType, onClose }: { rule: ApprovalMatrix | null, defaultDocType: "bill" | "payment", onClose: () => void }) {
    const t = useTranslations("finance.approvals.matrices.drawer")
    const tToast = useTranslations("finance.approvals.matrices.toast")
    const tCommon = useTranslations("common")
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
                toast.success(rule ? tToast("updated") : tToast("created"))
                onClose()
            },
            onError: (err: Error) => {
                toast.error(err?.message || tToast("saveFailed"))
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
        <Modal
            open
            onClose={onClose}
            variant="drawer"
            size="md"
            title={rule ? t("editTitle") : t("newTitle")}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>{tCommon("cancel")}</Button>
                    <Button onClick={handleSubmit(onSubmit)} disabled={isPending}>
                        {isPending ? t("saving") : rule ? t("saveChanges") : t("createRule")}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
                <Controller
                    name="document_type"
                    control={control}
                    render={({ field }) => (
                        <SearchableSelect
                            label={t("documentType")}
                            options={[
                                { value: "bill", label: t("documentTypes.bill") },
                                { value: "payment", label: t("documentTypes.payment") },
                            ]}
                            value={field.value}
                            onChange={field.onChange}
                        />
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <Field
                        label={t("minAmount")}
                        type="number"
                        step="0.01"
                        {...register("min_amount", {
                            required: t("minRequired"),
                            min: { value: 0, message: t("minNegative") }
                        })}
                        error={errors.min_amount?.message}
                    />

                    <Field
                        label={t("maxAmount")}
                        type="number"
                        step="0.01"
                        {...register("max_amount", {
                            required: t("maxRequired"),
                            validate: (val, formVals) =>
                                parseFloat(val) >= parseFloat(formVals.min_amount) || t("maxGteMin")
                        })}
                        error={errors.max_amount?.message}
                    />
                </div>

                <Field
                    label={t("levelLabel")}
                    type="number"
                    min="1"
                    step="1"
                    {...register("level", {
                        required: t("levelRequired"),
                        min: { value: 1, message: t("levelMin") }
                    })}
                    error={errors.level?.message}
                />

                <Controller
                    name="approver_user_id"
                    control={control}
                    rules={{ required: t("approverRequired") }}
                    render={({ field }) => (
                        <SearchableSelect
                            label={t("approver")}
                            options={memberOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t("approverPlaceholder")}
                        />
                    )}
                />
            </form>
        </Modal>
    )
}
