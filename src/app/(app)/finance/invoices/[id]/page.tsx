"use client"

import Link from "next/link"
import { use } from "react"
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
import { useInvoice, usePostInvoice, useVoidInvoice } from "@/features/finance/api-invoices"
import { formatIDR, formatDateID } from "@/lib/format"

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const t = useTranslations("finance.invoices.detail")
    const tDetail = useTranslations("finance.detail")
    const tCommon = useTranslations("common")
    const [confirm, confirmDialog] = useConfirm()

    const { data: invoice, isLoading } = useInvoice(id)
    const postInvoice = usePostInvoice()
    const voidInvoice = useVoidInvoice()

    if (isLoading) {
        return (
            <div className="grid w-full max-w-5xl gap-6" aria-busy="true">
                <Skeleton className="h-9 w-72" />
                <SkeletonCard />
                <Skeleton className="h-64 w-full rounded-lg" />
            </div>
        )
    }

    if (!invoice) {
        return (
            <div className="w-full max-w-5xl">
                <EmptyState
                    icon="request_quote"
                    title={t("notFound")}
                    description={t("notFoundHint")}
                    action={
                        <Link href="/finance/invoices" className={buttonVariants({ variant: "secondary" })}>
                            {t("backToList")}
                        </Link>
                    }
                />
            </div>
        )
    }

    const handlePost = async () => {
        const confirmed = await confirm({
            title: t("postConfirmTitle"),
            message: t("postConfirmMessage"),
            confirmLabel: t("post"),
            cancelLabel: tCommon("cancel"),
        })
        if (!confirmed) return
        postInvoice.mutate(invoice.id, {
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
        voidInvoice.mutate(invoice.id, {
            onSuccess: () => toast.success(t("voidSuccess")),
            onError: (err: Error) => toast.error(err?.message || t("voidError")),
        })
    }

    const lines = invoice.lines ?? []

    return (
        <div className="w-full max-w-5xl">
            <PageHeader
                backHref="/finance/invoices"
                backLabel={tCommon("back")}
                eyebrow={t("eyebrow")}
                title={t("title", { number: invoice.invoice_number })}
                status={<StatusBadge status={invoice.status} />}
                actions={
                    <>
                        {(invoice.status === "draft" || invoice.status === "posted") && (
                            <Button
                                variant="outline"
                                onClick={handleVoid}
                                disabled={postInvoice.isPending || voidInvoice.isPending}
                            >
                                {voidInvoice.isPending ? t("voiding") : t("void")}
                            </Button>
                        )}
                        {invoice.status === "draft" && (
                            <Button
                                onClick={handlePost}
                                disabled={postInvoice.isPending || voidInvoice.isPending}
                            >
                                {postInvoice.isPending ? t("posting") : t("post")}
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
                        <CardValue size="lg">{formatIDR(parseFloat(invoice.total))}</CardValue>
                        <div className="mt-1 text-sm text-ink-muted">
                            {t("billedTo")}{" "}
                            <span className="font-semibold text-ink-secondary">
                                {invoice.partner?.name || t("customerFallback", { id: invoice.partner_id })}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-6 text-end">
                        <div>
                            <CardLabel className="mb-1">{t("invoiceDate")}</CardLabel>
                            <div className="font-medium text-ink">{formatDateID(invoice.invoice_date)}</div>
                        </div>
                        <div>
                            <CardLabel className="mb-1">{t("dueDate")}</CardLabel>
                            <div className="font-medium text-ink">{formatDateID(invoice.due_date)}</div>
                        </div>
                    </div>
                </Card>

                <DataTable
                    columns={[
                        t("lines.description"),
                        { label: t("lines.qty"), align: "end" },
                        { label: t("lines.unitPrice"), align: "end" },
                        { label: t("lines.tax"), align: "end" },
                        { label: t("lines.amount"), align: "end" },
                    ]}
                >
                    <TableStateRow
                        isLoading={false}
                        count={lines.length}
                        columns={5}
                        emptyMessage={t("lines.empty")}
                    />
                    {lines.map((line, idx) => (
                        <tr key={idx}>
                            <td className="text-ink">{line.description}</td>
                            <td className="text-end tabular-nums">{parseFloat(line.quantity)}</td>
                            <td className="text-end tabular-nums">{formatIDR(parseFloat(line.unit_price))}</td>
                            <td className="text-end tabular-nums">{formatIDR(parseFloat(line.tax_amount))}</td>
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
                            {invoice.notes || tDetail("noNotes")}
                        </p>
                    </Card>
                    <Card padding="lg" className="flex flex-col gap-3">
                        <div className="flex justify-between text-sm font-semibold text-ink-muted">
                            <span>{tDetail("subtotal")}</span>
                            <span className="tabular-nums">{formatIDR(parseFloat(invoice.subtotal))}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold text-ink-muted">
                            <span>{tDetail("taxTotal")}</span>
                            <span className="tabular-nums">{formatIDR(parseFloat(invoice.tax_total))}</span>
                        </div>
                        <div className="my-1 border-t border-line" />
                        <div className="flex justify-between text-xl font-bold text-ink">
                            <span>{tDetail("total")}</span>
                            <span className="tabular-nums">{formatIDR(parseFloat(invoice.total))}</span>
                        </div>
                        <div className="mt-2 flex justify-between text-sm font-semibold text-brand-ink">
                            <span>{tDetail("amountPaid")}</span>
                            <span className="tabular-nums">{formatIDR(parseFloat(invoice.amount_paid))}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold text-error-strong">
                            <span>{tDetail("balanceDue")}</span>
                            <span className="tabular-nums">
                                {formatIDR(parseFloat(invoice.total) - parseFloat(invoice.amount_paid))}
                            </span>
                        </div>
                    </Card>
                </div>
            </div>

            {confirmDialog}
        </div>
    )
}
