"use client"

import Link from "next/link"
import { use, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardLabel, CardValue } from "@/components/ui/card"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { DataTable } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import { TableStateRow } from "@/components/ui/table-state-row"
import { useSession } from "@/features/auth/session-provider"
import {
    useActOnApproval,
    useApprovalMatrices,
    useCompanyMembers,
    useSubmitBillApproval,
    type ApprovalRequest,
} from "@/features/finance/api-approvals"
import { useBill, usePostBill, useVoidBill, type Bill } from "@/features/finance/api-bills"
import { ApprovalConsole } from "@/features/finance/components/approval-console"
import { formatIDR, formatDateID } from "@/lib/format"

export default function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { user, activeCompanyId } = useSession()
    const t = useTranslations("finance.bills.detail")
    const tDetail = useTranslations("finance.detail")
    const tApprovals = useTranslations("finance.approvals")
    const tCommon = useTranslations("common")
    const [confirm, confirmDialog] = useConfirm()

    const { data: bill, isLoading } = useBill(id)
    const postBill = usePostBill()
    const voidBill = useVoidBill()
    const submitApproval = useSubmitBillApproval()
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

    if (!bill) {
        return (
            <div className="w-full max-w-5xl">
                <EmptyState
                    icon="receipt"
                    title={t("notFound")}
                    description={t("notFoundHint")}
                    action={
                        <Link href="/finance/bills" className={buttonVariants({ variant: "secondary" })}>
                            {t("backToList")}
                        </Link>
                    }
                />
            </div>
        )
    }

    const request = (bill as Bill & { approval_request?: ApprovalRequest }).approval_request
    const isDraft = bill.status === "draft"

    // Check if the bill total falls into any configured matrix rule bands
    const requiresApproval = matrices.some(
        (rule) =>
            rule.document_type === "bill" &&
            parseFloat(bill.total) >= parseFloat(rule.min_amount) &&
            parseFloat(bill.total) <= parseFloat(rule.max_amount),
    )

    const isApproved = request && request.status === "approved"
    const isPending = request && request.status === "pending"

    const activeLevel = request?.current_level

    const matchingRule =
        isPending &&
        matrices.find(
            (rule) =>
                rule.document_type === "bill" &&
                rule.level === activeLevel &&
                parseFloat(bill.total) >= parseFloat(rule.min_amount) &&
                parseFloat(bill.total) <= parseFloat(rule.max_amount),
        )

    const isCurrentUserApprover = Boolean(matchingRule && matchingRule.approver_user_id === user?.id)
    const activeApproverName = matchingRule
        ? memberships.find((m) => m.user_id === matchingRule.approver_user_id)?.user?.name ||
          tApprovals("userFallback", { id: matchingRule.approver_user_id })
        : tApprovals("unknownApprover")

    const handlePost = async () => {
        const confirmed = await confirm({
            title: t("postConfirmTitle"),
            message: t("postConfirmMessage"),
            confirmLabel: t("post"),
            cancelLabel: tCommon("cancel"),
        })
        if (!confirmed) return
        postBill.mutate(bill.id, {
            onSuccess: () => toast.success(t("postSuccess")),
            onError: (err: Error) => toast.error(err?.message || t("postError")),
        })
    }

    const handleVoid = async () => {
        const confirmed = await confirm({
            title: t("voidConfirmTitle"),
            message: t("voidConfirmMessage"),
            confirmLabel: t("void"),
            cancelLabel: tCommon("cancel"),
            danger: true,
        })
        if (!confirmed) return
        voidBill.mutate(bill.id, {
            onSuccess: () => toast.success(t("voidSuccess")),
            onError: (err: Error) => toast.error(err?.message || t("voidError")),
        })
    }

    const handleSubmitApproval = () => {
        submitApproval.mutate(bill.id, {
            onSuccess: () => toast.success(tApprovals("submitSuccess", { doc: t("doc") })),
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

    const lines = bill.lines ?? []
    const taxTotal = parseFloat(bill.tax_total)
    const withholdingTotal = parseFloat(bill.withholding_total)

    return (
        <div className="w-full max-w-5xl">
            <PageHeader
                backHref="/finance/bills"
                backLabel={tCommon("back")}
                eyebrow={t("eyebrow")}
                title={t("title", { number: bill.bill_number })}
                status={<StatusBadge status={bill.status} />}
                actions={
                    <>
                        {(isDraft || bill.status === "posted") && (
                            <Button
                                variant="outline"
                                onClick={handleVoid}
                                disabled={
                                    postBill.isPending || voidBill.isPending || submitApproval.isPending
                                }
                            >
                                {voidBill.isPending ? t("voiding") : t("void")}
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
                                disabled={postBill.isPending || voidBill.isPending}
                            >
                                {postBill.isPending ? t("posting") : t("post")}
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
                        <CardValue size="lg">{formatIDR(parseFloat(bill.total))}</CardValue>
                        <div className="mt-1 text-sm text-ink-muted">
                            {t("billedFrom")}{" "}
                            <span className="font-semibold text-ink-secondary">
                                {bill.partner?.name || t("vendorFallback", { id: bill.partner_id })}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-6 text-end">
                        <div>
                            <CardLabel className="mb-1">{t("billDate")}</CardLabel>
                            <div className="font-medium text-ink">{formatDateID(bill.bill_date)}</div>
                        </div>
                        <div>
                            <CardLabel className="mb-1">{t("dueDate")}</CardLabel>
                            <div className="font-medium text-ink">{formatDateID(bill.due_date)}</div>
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
                        t("lines.description"),
                        { label: t("lines.qty"), align: "end" },
                        { label: t("lines.unitPrice"), align: "end" },
                        { label: t("lines.ppn"), align: "end" },
                        { label: t("lines.pph"), align: "end" },
                        { label: t("lines.amount"), align: "end" },
                    ]}
                >
                    <TableStateRow
                        isLoading={false}
                        count={lines.length}
                        columns={6}
                        emptyMessage={t("lines.empty")}
                    />
                    {lines.map((line, idx) => (
                        <tr key={idx}>
                            <td className="text-ink">{line.description}</td>
                            <td className="text-end tabular-nums">{parseFloat(line.quantity)}</td>
                            <td className="text-end tabular-nums">{formatIDR(parseFloat(line.unit_price))}</td>
                            <td className="text-end text-brand-ink tabular-nums">
                                {parseFloat(line.tax_amount) > 0 ? formatIDR(parseFloat(line.tax_amount)) : "-"}
                            </td>
                            <td className="text-end text-error-strong tabular-nums">
                                {parseFloat(line.withholding_amount) > 0
                                    ? formatIDR(parseFloat(line.withholding_amount))
                                    : "-"}
                            </td>
                            <td className="text-end font-semibold text-ink tabular-nums">
                                {formatIDR(parseFloat(line.line_total))}
                            </td>
                        </tr>
                    ))}
                </DataTable>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Card padding="lg">
                        <h3 className="type-card-label mb-3">{tDetail("notes")}</h3>
                        <p className="whitespace-pre-wrap text-sm text-ink-secondary">
                            {bill.notes || tDetail("noNotes")}
                        </p>
                    </Card>
                    <Card padding="lg" className="flex flex-col gap-3">
                        <div className="flex justify-between text-sm font-semibold text-ink-muted">
                            <span>{tDetail("subtotal")}</span>
                            <span className="tabular-nums">{formatIDR(parseFloat(bill.subtotal))}</span>
                        </div>
                        {taxTotal > 0 && (
                            <div className="flex justify-between text-sm font-semibold text-ink-muted">
                                <span>{tDetail("ppn")}</span>
                                <span className="text-brand-ink tabular-nums">+{formatIDR(taxTotal)}</span>
                            </div>
                        )}
                        {withholdingTotal > 0 && (
                            <div className="flex justify-between text-sm font-semibold text-ink-muted">
                                <span>{tDetail("pph")}</span>
                                <span className="text-error-strong tabular-nums">
                                    -{formatIDR(withholdingTotal)}
                                </span>
                            </div>
                        )}
                        <div className="my-1 border-t border-line" />
                        <div className="flex justify-between text-xl font-bold text-ink">
                            <span>{tDetail("total")}</span>
                            <span className="tabular-nums">{formatIDR(parseFloat(bill.total))}</span>
                        </div>
                        <div className="mt-2 flex justify-between text-sm font-semibold text-brand-ink">
                            <span>{tDetail("amountPaid")}</span>
                            <span className="tabular-nums">{formatIDR(parseFloat(bill.amount_paid))}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold text-error-strong">
                            <span>{tDetail("balanceDue")}</span>
                            <span className="tabular-nums">
                                {formatIDR(parseFloat(bill.total) - parseFloat(bill.amount_paid))}
                            </span>
                        </div>
                    </Card>
                </div>
            </div>

            {confirmDialog}
        </div>
    )
}
