"use client"

import Link from "next/link"
import { use, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardLabel } from "@/components/ui/card"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { DataTable } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { Icon } from "@/components/ui/icon"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import { TableStateRow } from "@/components/ui/table-state-row"
import { useSession } from "@/features/auth/session-provider"
import {
    useActOnApproval,
    useApprovalMatrices,
    useCompanyMembers,
    useSubmitPaymentApproval,
    type ApprovalRequest,
} from "@/features/finance/api-approvals"
import { usePayment, usePostPayment, useVoidPayment, type Payment } from "@/features/finance/api-payments"
import { ApprovalConsole } from "@/features/finance/components/approval-console"
import { formatIDR, formatDateID } from "@/lib/format"
import { cn } from "@/lib/utils"

export default function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { user, activeCompanyId } = useSession()
    const t = useTranslations("finance.payments.detail")
    const tApprovals = useTranslations("finance.approvals")
    const tCommon = useTranslations("common")
    const [confirm, confirmDialog] = useConfirm()

    const { data: payment, isLoading } = usePayment(id)
    const postPayment = usePostPayment()
    const voidPayment = useVoidPayment()
    const submitApproval = useSubmitPaymentApproval()
    const actApproval = useActOnApproval()
    const { data: matrices = [] } = useApprovalMatrices(activeCompanyId)
    const { data: memberships = [] } = useCompanyMembers(activeCompanyId)

    const [remark, setRemark] = useState("")

    if (isLoading) {
        return (
            <div className="grid w-full max-w-5xl gap-6" aria-busy="true">
                <Skeleton className="h-9 w-72" />
                <SkeletonCard />
                <Skeleton className="h-64 w-full rounded-lg" />
            </div>
        )
    }

    if (!payment) {
        return (
            <div className="w-full max-w-5xl">
                <EmptyState
                    icon="account_balance_wallet"
                    title={t("notFound")}
                    description={t("notFoundHint")}
                    action={
                        <Link href="/finance/payments" className={buttonVariants({ variant: "secondary" })}>
                            {t("backToList")}
                        </Link>
                    }
                />
            </div>
        )
    }

    const isOutgoing = payment.payment_type === "outbound"
    const docLabel = isOutgoing ? t("docPayment") : t("docReceipt")
    const request = (payment as Payment & { approval_request?: ApprovalRequest }).approval_request
    const isDraft = payment.status === "draft"

    // Check if the payment amount falls into any configured matrix rule bands
    const requiresApproval = matrices.some(
        (rule) =>
            rule.document_type === "payment" &&
            parseFloat(payment.amount) >= parseFloat(rule.min_amount) &&
            parseFloat(payment.amount) <= parseFloat(rule.max_amount),
    )

    const isApproved = request && request.status === "approved"
    const isPending = request && request.status === "pending"

    const activeLevel = request?.current_level

    const matchingRule =
        isPending &&
        matrices.find(
            (rule) =>
                rule.document_type === "payment" &&
                rule.level === activeLevel &&
                parseFloat(payment.amount) >= parseFloat(rule.min_amount) &&
                parseFloat(payment.amount) <= parseFloat(rule.max_amount),
        )

    const isCurrentUserApprover = Boolean(matchingRule && matchingRule.approver_user_id === user?.id)
    const activeApproverName = matchingRule
        ? memberships.find((m) => m.user_id === matchingRule.approver_user_id)?.user?.name ||
          tApprovals("userFallback", { id: matchingRule.approver_user_id })
        : tApprovals("unknownApprover")

    const handlePost = async () => {
        const confirmed = await confirm({
            title: t("postConfirmTitle", { doc: docLabel }),
            message: t("postConfirmMessage"),
            confirmLabel: t("post", { doc: docLabel }),
            cancelLabel: tCommon("cancel"),
        })
        if (!confirmed) return
        postPayment.mutate(payment.id, {
            onSuccess: () => toast.success(t("postSuccess", { doc: docLabel })),
            onError: (err: Error) => toast.error(err?.message || t("postError", { doc: docLabel })),
        })
    }

    const handleVoid = async () => {
        const confirmed = await confirm({
            title: t("voidConfirmTitle", { doc: docLabel }),
            message: t("voidConfirmMessage"),
            confirmLabel: t("void", { doc: docLabel }),
            cancelLabel: tCommon("cancel"),
            danger: true,
        })
        if (!confirmed) return
        voidPayment.mutate(payment.id, {
            onSuccess: () => toast.success(t("voidSuccess", { doc: docLabel })),
            onError: (err: Error) => toast.error(err?.message || t("voidError", { doc: docLabel })),
        })
    }

    const handleSubmitApproval = () => {
        submitApproval.mutate(payment.id, {
            onSuccess: () => toast.success(tApprovals("submitSuccess", { doc: docLabel })),
            onError: (err: Error) => toast.error(err?.message || tApprovals("submitError")),
        })
    }

    const handleAct = (action: "approved" | "rejected") => {
        if (!request) return
        actApproval.mutate(
            { id: request.id, action, remark },
            {
                onSuccess: () => {
                    toast.success(
                        action === "approved"
                            ? tApprovals("approveSuccess")
                            : tApprovals("rejectSuccess"),
                    )
                    setRemark("")
                },
                onError: (err: Error) => {
                    toast.error(err?.message || tApprovals("actError"))
                },
            },
        )
    }

    // Post is allowed for drafts that either need no approval, or are fully approved.
    const canPost = isDraft && (!requiresApproval || isApproved)
    const canSubmitFromHeader = isDraft && requiresApproval && !request

    const allocations = payment.allocations ?? []
    const allocatedTotal = allocations.reduce((sum, alloc) => sum + parseFloat(alloc.amount), 0)
    const unallocated = Math.max(parseFloat(payment.amount) - allocatedTotal, 0)

    return (
        <div className="w-full max-w-5xl pb-10">
            <PageHeader
                backHref="/finance/payments"
                backLabel={tCommon("back")}
                eyebrow={t("eyebrow")}
                title={t("title", { doc: docLabel, number: payment.payment_number })}
                status={<StatusBadge status={payment.status} />}
                actions={
                    <>
                        {(isDraft || payment.status === "posted") && (
                            <Button
                                variant="outline"
                                onClick={handleVoid}
                                disabled={
                                    postPayment.isPending ||
                                    voidPayment.isPending ||
                                    submitApproval.isPending
                                }
                            >
                                {voidPayment.isPending ? t("voiding") : t("void", { doc: docLabel })}
                            </Button>
                        )}
                        {canSubmitFromHeader && (
                            <Button onClick={handleSubmitApproval} disabled={submitApproval.isPending}>
                                {submitApproval.isPending
                                    ? tApprovals("submitting")
                                    : tApprovals("submit")}
                            </Button>
                        )}
                        {canPost && (
                            <Button
                                onClick={handlePost}
                                disabled={postPayment.isPending || voidPayment.isPending}
                            >
                                {postPayment.isPending ? t("posting") : t("post", { doc: docLabel })}
                            </Button>
                        )}
                    </>
                }
            />

            <div className="grid gap-6">
                <Card
                    padding="lg"
                    className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center"
                >
                    <div>
                        <h2
                            className={cn(
                                "text-3xl font-bold tabular-nums",
                                isOutgoing ? "text-error-strong" : "text-brand-ink",
                            )}
                        >
                            {isOutgoing ? "-" : "+"}
                            {formatIDR(parseFloat(payment.amount))}
                        </h2>
                        <div className="mt-1 text-sm text-ink-muted">
                            {isOutgoing ? t("paidTo") : t("receivedFrom")}{" "}
                            <span className="font-semibold text-ink-secondary">
                                {payment.partner?.name || t("partnerFallback", { id: payment.partner_id })}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-6 text-end">
                        <div>
                            <CardLabel className="mb-1">{t("date")}</CardLabel>
                            <div className="font-medium text-ink">{formatDateID(payment.payment_date)}</div>
                        </div>
                        <div>
                            <CardLabel className="mb-1">{t("method")}</CardLabel>
                            <div className="font-medium text-ink capitalize">
                                {payment.payment_method.replace("_", " ")}
                            </div>
                        </div>
                        <div>
                            <CardLabel className="mb-1">{t("bankCash")}</CardLabel>
                            <div className="font-medium text-ink">
                                {t("accountFallback", { id: payment.cash_account_id })}
                            </div>
                        </div>
                    </div>
                </Card>

                {requiresApproval && (
                    <ApprovalConsole
                        request={request}
                        submitPending={submitApproval.isPending}
                        onSubmit={handleSubmitApproval}
                        remark={remark}
                        onRemarkChange={setRemark}
                        actPending={actApproval.isPending}
                        onAct={handleAct}
                        isCurrentUserApprover={isCurrentUserApprover}
                        activeApproverName={activeApproverName}
                        activeLevel={activeLevel}
                    />
                )}

                <DataTable
                    columns={[
                        t("allocations.document"),
                        { label: t("allocations.documentTotal"), align: "end" },
                        { label: t("allocations.amount"), align: "end" },
                    ]}
                    toolbar={
                        <h3 className="type-section flex items-center gap-2">
                            <Icon name="account_tree" size={18} className="text-ink-faint" />
                            {t("allocations.title")}
                        </h3>
                    }
                    footer={
                        <div className="flex items-center justify-between gap-4 bg-surface-muted/50 px-6 py-4 text-sm">
                            <div className="type-card-label">{t("allocations.unallocated")}</div>
                            <div className="text-xl font-bold text-ink tabular-nums">
                                {formatIDR(unallocated)}
                            </div>
                        </div>
                    }
                >
                    <TableStateRow
                        isLoading={false}
                        count={allocations.length}
                        columns={3}
                        emptyMessage={t("allocations.empty")}
                    />
                    {allocations.map((alloc, idx) => {
                        const isBill = Boolean(alloc.bill_id)
                        const documentId = alloc.bill_id ?? alloc.invoice_id
                        const linkPrefix = isBill ? "/finance/bills" : "/finance/invoices"
                        const number = isBill
                            ? t("allocations.bill", { id: documentId ?? "-" })
                            : t("allocations.invoice", { id: documentId ?? "-" })

                        return (
                            <tr key={idx}>
                                <td>
                                    <Link
                                        href={`${linkPrefix}/${documentId}`}
                                        className="font-medium text-brand-ink hover:underline"
                                    >
                                        {number}
                                    </Link>
                                </td>
                                <td className="text-end tabular-nums">-</td>
                                <td className="text-end font-bold text-ink tabular-nums">
                                    {formatIDR(parseFloat(alloc.amount))}
                                </td>
                            </tr>
                        )
                    })}
                </DataTable>

                <Card padding="lg">
                    <h3 className="type-card-label mb-3">{t("notesTitle")}</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <div className="mb-1 text-xs text-ink-faint">{t("referenceNumber")}</div>
                            <div className="font-medium text-ink">-</div>
                        </div>
                        <div>
                            <div className="mb-1 text-xs text-ink-faint">{t("notes")}</div>
                            <div className="whitespace-pre-wrap text-sm text-ink-secondary">
                                {payment.notes || "-"}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {confirmDialog}
        </div>
    )
}
