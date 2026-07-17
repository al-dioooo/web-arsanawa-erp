"use client"

import { useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterBar } from "@/components/ui/filter-bar"
import { Icon } from "@/components/ui/icon"
import { Modal } from "@/components/ui/modal"
import { PageHeader } from "@/components/ui/page-header"
import { SelectDescription } from "@/components/ui/select-description"
import { StatusBadge } from "@/components/ui/status-badge"
import { TableStateRow } from "@/components/ui/table-state-row"
import { useSession } from "@/features/auth/session-provider"
import { useApprovalRequests, useActOnApproval, useApprovalMatrices, useCompanyMembers, type ApprovalRequest } from "@/features/finance/api-approvals"
import { formatIDR, formatDateID } from "@/lib/format"
import { cn } from "@/lib/utils"

const TABS = ["pending", "approved", "rejected"] as const

export default function ApprovalRequestsPage() {
    const t = useTranslations("finance.approvals.requests")
    const { activeCompanyId } = useSession()
    const [statusFilter, setStatusFilter] = useState<string>("pending")
    const { data: response, isLoading } = useApprovalRequests(activeCompanyId, {
        status: statusFilter || undefined
    })

    const requests = response?.approval_requests || []
    const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null)

    return (
        <div className="w-full">
            <PageHeader eyebrow={t("eyebrow")} title={t("title")} />

            <FilterBar>
                <div className="flex gap-2">
                    <SelectDescription
                        label={t("filter.status")}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        options={[
                            { value: "", label: t("filter.all"), description: t("filter.allDesc") },
                            { value: "pending", label: t("filter.pending"), description: t("filter.pendingDesc") },
                            { value: "approved", label: t("filter.approved"), description: t("filter.approvedDesc") },
                            { value: "rejected", label: t("filter.rejected"), description: t("filter.rejectedDesc") },
                        ]}
                    />
                </div>
            </FilterBar>

            <div className="mb-4 flex gap-4 border-b border-line">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setStatusFilter(tab)}
                        className={cn(
                            "cursor-pointer border-b-2 px-1 py-2 text-sm font-semibold transition-colors",
                            statusFilter === tab
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
                    t("table.documentType"),
                    t("table.refNumber"),
                    t("table.amount"),
                    t("table.currentLevel"),
                    t("table.submittedDate"),
                    t("table.status"),
                    t("table.actions"),
                ]}
            >
                <TableStateRow
                    isLoading={isLoading}
                    count={requests.length}
                    columns={7}
                    emptyMessage={t("empty")}
                />
                {requests.map((request) => {
                    const isBill = request.approvable_type.includes("Bill")
                    const typeLabel = isBill ? t("docTypes.bill") : t("docTypes.payment")
                    const refNumber = isBill
                        ? (request.approvable?.bill_number || t("fallbackBillRef", { id: request.approvable_id }))
                        : (request.approvable?.payment_number || t("fallbackPaymentRef", { id: request.approvable_id }))
                    const amount = isBill
                        ? (request.approvable?.total || "0")
                        : (request.approvable?.amount || "0")
                    const detailLink = isBill
                        ? `/finance/bills/${request.approvable_id}`
                        : `/finance/payments/${request.approvable_id}`

                    return (
                        <tr key={request.id}>
                            <td className="font-semibold text-ink">{typeLabel}</td>
                            <td>
                                <Link href={detailLink} className="font-semibold text-brand-ink hover:underline">
                                    {refNumber}
                                </Link>
                            </td>
                            <td className="font-bold text-ink">{formatIDR(parseFloat(amount))}</td>
                            <td className="font-mono font-medium text-ink-secondary">{t("level", { level: request.current_level })}</td>
                            <td className="text-sm text-ink-muted">
                                {request.created_at ? formatDateID(request.created_at) : "-"}
                            </td>
                            <td>
                                <StatusBadge status={request.status} />
                            </td>
                            <td>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setSelectedRequest(request)}
                                >
                                    {t("review")}
                                </Button>
                            </td>
                        </tr>
                    )
                })}
            </DataTable>

            {selectedRequest && (
                <ApprovalActionDrawer
                    request={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                />
            )}
        </div>
    )
}

function ApprovalActionDrawer({ request, onClose }: { request: ApprovalRequest; onClose: () => void }) {
    const t = useTranslations("finance.approvals.requests.drawer")
    const tRequests = useTranslations("finance.approvals.requests")
    const tToast = useTranslations("finance.approvals.requests.toast")
    const { user: sessionUser, activeCompanyId } = useSession()
    const { data: matrices = [] } = useApprovalMatrices(activeCompanyId)
    const { data: memberships = [] } = useCompanyMembers(activeCompanyId)
    const actMutation = useActOnApproval()
    const [remark, setRemark] = useState("")

    const isBill = request.approvable_type.includes("Bill")
    const docType = isBill ? "bill" : "payment"
    const amount = isBill
        ? (request.approvable?.total || "0")
        : (request.approvable?.amount || "0")

    const matchingRule = matrices.find(
        rule => rule.document_type === docType
            && rule.level === request.current_level
            && parseFloat(amount) >= parseFloat(rule.min_amount)
            && parseFloat(amount) <= parseFloat(rule.max_amount)
    )

    const isCurrentUserApprover = matchingRule && matchingRule.approver_user_id === sessionUser?.id
    const activeApproverName = matchingRule
        ? (memberships.find(m => m.user_id === matchingRule.approver_user_id)?.user?.name || t("userFallback", { id: matchingRule.approver_user_id }))
        : t("unknownApprover")

    const handleAction = (action: 'approved' | 'rejected') => {
        actMutation.mutate({ id: request.id, action, remark }, {
            onSuccess: () => {
                toast.success(action === 'approved' ? tToast("approved") : tToast("rejected"))
                onClose()
            },
            onError: (err: Error) => {
                toast.error(err?.message || tToast("actionFailed"))
            }
        })
    }

    return (
        <Modal open onClose={onClose} variant="drawer" size="lg" title={t("title")}>
            <div className="flex flex-col gap-6">
                {/* Document details box */}
                <Card inset padding="sm">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="type-card-label mb-0.5 block">{t("documentType")}</span>
                            <span className="font-bold text-ink">{tRequests(`docTypes.${docType}`)}</span>
                        </div>
                        <div>
                            <span className="type-card-label mb-0.5 block">{t("reference")}</span>
                            <span className="font-bold text-ink">
                                {isBill
                                    ? (request.approvable?.bill_number || tRequests("fallbackBillRef", { id: request.approvable_id }))
                                    : (request.approvable?.payment_number || tRequests("fallbackPaymentRef", { id: request.approvable_id }))}
                            </span>
                        </div>
                        <div>
                            <span className="type-card-label mb-0.5 block">{t("amount")}</span>
                            <span className="font-bold text-brand-ink">{formatIDR(parseFloat(amount))}</span>
                        </div>
                        <div>
                            <span className="type-card-label mb-0.5 block">{t("currentLevel")}</span>
                            <span className="font-mono font-bold text-ink">{tRequests("level", { level: request.current_level })}</span>
                        </div>
                    </div>
                </Card>

                {/* Timeline / Actions Trail */}
                <div>
                    <h3 className="mb-3 text-sm font-bold text-ink">{t("trail")}</h3>
                    <div className="ml-2 flex flex-col gap-4 border-l-2 border-line pl-4">
                        {request.actions?.map((action, idx) => (
                            <div key={idx} className="relative">
                                <div className={cn(
                                    "absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface ring-4 ring-surface",
                                    action.action === 'approved' ? 'bg-success' : 'bg-error'
                                )} />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-ink">
                                            {action.user?.name || t("userFallback", { id: action.user_id })}
                                        </span>
                                        <span className={cn(
                                            "rounded px-1.5 py-0.5 text-xs font-bold",
                                            action.action === 'approved'
                                                ? 'bg-success-soft text-success-strong'
                                                : 'bg-error-soft text-error-strong'
                                        )}>
                                            {action.action === 'approved'
                                                ? t("approvedBadge", { level: action.level })
                                                : t("rejectedBadge", { level: action.level })}
                                        </span>
                                    </div>
                                    {action.remark && (
                                        <p className="mt-1 rounded bg-surface-muted/50 p-2 text-sm italic text-ink-secondary">
                                            &quot;{action.remark}&quot;
                                        </p>
                                    )}
                                    <span className="mt-1 block text-xs text-ink-faint">
                                        {formatDateID(action.acted_at)}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {(!request.actions || request.actions.length === 0) && (
                            <p className="text-xs italic text-ink-faint">{t("noActions")}</p>
                        )}
                    </div>
                </div>

                {/* Action form */}
                {request.status === 'pending' && (
                    <div className="mt-auto border-t border-line pt-6">
                        {isCurrentUserApprover ? (
                            <div className="flex flex-col gap-4">
                                <Field
                                    label={t("remarks")}
                                    placeholder={t("remarksPlaceholder")}
                                    value={remark}
                                    onChange={(e) => setRemark(e.target.value)}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleAction('rejected')}
                                        disabled={actMutation.isPending}
                                    >
                                        {t("reject")}
                                    </Button>
                                    <Button
                                        onClick={() => handleAction('approved')}
                                        disabled={actMutation.isPending}
                                    >
                                        {actMutation.isPending ? t("approving") : t("approve")}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-3 rounded-lg bg-warning-soft p-4 text-sm text-warning-strong">
                                <Icon name="warning" className="shrink-0" />
                                <div>
                                    <p className="font-semibold">{t("locked")}</p>
                                    <p className="mt-0.5 text-xs">
                                        {t("lockedHint", { name: activeApproverName, level: request.current_level })}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    )
}
