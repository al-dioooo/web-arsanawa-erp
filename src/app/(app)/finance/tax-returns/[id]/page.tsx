"use client"

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardLabel, CardValue } from "@/components/ui/card"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { DataTable } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { Icon } from "@/components/ui/icon"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import { StatusPill } from "@/components/ui/status-pill"
import { useSession } from "@/features/auth/session-provider"
import {
    useTaxReturn,
    useFinalizeTaxReturn,
    useDeleteTaxReturn,
} from "@/features/finance/api-tax-returns"
import { formatIDR, formatDateID } from "@/lib/format"
import { cn } from "@/lib/utils"

export default function TaxReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const t = useTranslations("finance.taxReturns.detail")
    const tTypes = useTranslations("finance.taxReturns")
    const tCommon = useTranslations("common")
    const router = useRouter()
    useSession()
    const { data: taxReturn, isLoading } = useTaxReturn(id)
    const finalize = useFinalizeTaxReturn()
    const deleteTaxReturn = useDeleteTaxReturn()
    const [confirm, confirmDialog] = useConfirm()

    const handleFinalize = () => {
        if (!taxReturn) return
        finalize.mutate(taxReturn.id, {
            onSuccess: () => {
                toast.success(t("toast.finalized"))
            },
            onError: (err: Error) => {
                toast.error(err?.message || t("toast.finalizeFailed"))
            },
        })
    }

    const handleDelete = async () => {
        if (!taxReturn) return
        const ok = await confirm({
            title: t("deleteConfirm.title"),
            message: t("deleteConfirm.message"),
            confirmLabel: tCommon("delete"),
            cancelLabel: tCommon("cancel"),
            danger: true,
        })
        if (!ok) return
        deleteTaxReturn.mutate(taxReturn.id, {
            onSuccess: () => {
                toast.success(t("toast.deleted"))
                router.push('/finance/tax-returns')
            },
            onError: (err: Error) => {
                toast.error(err?.message || t("toast.deleteFailed"))
            },
        })
    }

    if (isLoading) {
        return (
            <div className="grid w-full max-w-5xl gap-6">
                <Skeleton className="h-24 w-full" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (!taxReturn) {
        return (
            <div className="w-full">
                <EmptyState
                    icon="error_outline"
                    title={t("notFound")}
                    action={
                        <Button variant="secondary" onClick={() => router.push('/finance/tax-returns')}>
                            {t("backToList")}
                        </Button>
                    }
                />
            </div>
        )
    }

    const output = parseFloat(taxReturn.total_output)
    const input = parseFloat(taxReturn.total_input)
    const payable = parseFloat(taxReturn.total_payable)
    const isDraft = taxReturn.status === 'draft'
    const lines = taxReturn.lines || []

    return (
        <div className="w-full max-w-5xl">
            <PageHeader
                eyebrow={tTypes("eyebrow")}
                backHref="/finance/tax-returns"
                backLabel={t("back")}
                title={t("title", { type: tTypes(`types.${taxReturn.tax_type === 'ppn' ? 'ppn' : 'pph23'}`) })}
                actions={
                    isDraft ? (
                        <>
                            <Button variant="destructive" onClick={() => void handleDelete()}>
                                {tCommon("delete")}
                            </Button>
                            <Button size="lg" onClick={handleFinalize} disabled={finalize.isPending}>
                                {finalize.isPending ? t("finalizing") : t("finalize")}
                            </Button>
                        </>
                    ) : undefined
                }
            />

            {/* Period + Status header */}
            <Card padding="lg" className="mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <CardLabel className="mb-1">{t("reportingPeriod")}</CardLabel>
                        <CardValue>
                            {formatDateID(taxReturn.period_start)} — {formatDateID(taxReturn.period_end)}
                        </CardValue>
                    </div>
                    <div className="flex items-center gap-3">
                        <StatusPill tone={taxReturn.tax_type === 'ppn' ? 'teal' : 'orange'}>
                            {tTypes(`typeShort.${taxReturn.tax_type === 'ppn' ? 'ppn' : 'pph23'}`)}
                        </StatusPill>
                        <StatusBadge status={taxReturn.status} />
                    </div>
                </div>

                {taxReturn.journal_entry_id && (
                    <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
                        <Icon name="menu_book" className="text-ink-faint" />
                        <span className="text-sm text-ink-muted">{t("finalizedIn")}</span>
                        <Link
                            href={`/finance/journals/${taxReturn.journal_entry_id}`}
                            className="text-sm font-semibold text-brand-ink underline decoration-dotted hover:text-brand"
                        >
                            JE-{taxReturn.journal_entry_id}
                        </Link>
                    </div>
                )}

                {isDraft && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg bg-warning-soft px-4 py-3 text-warning-strong">
                        <Icon name="pending" className="mt-0.5 shrink-0 text-base" />
                        <p className="text-sm font-medium">{t("draftNotice")}</p>
                    </div>
                )}
            </Card>

            {/* KPI Summary */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card padding="md">
                    <CardLabel className="mb-2 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        {t("totalOutput")}
                    </CardLabel>
                    <CardValue>{formatIDR(output)}</CardValue>
                    <div className="mt-1 text-sm text-ink-muted">{t("outputHint")}</div>
                </Card>
                <Card padding="md">
                    <CardLabel className="mb-2 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-brand" />
                        {t("totalInput")}
                    </CardLabel>
                    <CardValue>{formatIDR(input)}</CardValue>
                    <div className="mt-1 text-sm text-ink-muted">{t("inputHint")}</div>
                </Card>
                <Card
                    padding="md"
                    className={payable > 0 ? "bg-error-soft" : "bg-success-soft"}
                >
                    <CardLabel
                        className={cn(
                            "mb-2 flex items-center gap-1.5",
                            payable > 0 ? "text-error-strong" : "text-success-strong"
                        )}
                    >
                        <span className={cn("h-2 w-2 rounded-full", payable > 0 ? "bg-error" : "bg-success")} />
                        {t("netPayable")}
                    </CardLabel>
                    <CardValue
                        size="lg"
                        className={payable > 0 ? "text-error-strong" : "text-success-strong"}
                    >
                        {formatIDR(payable)}
                    </CardValue>
                    <div className={cn("mt-1 text-sm", payable > 0 ? "text-error-strong" : "text-success-strong")}>
                        {payable > 0 ? t("payableHint") : t("creditHint")}
                    </div>
                </Card>
            </div>

            {/* Transaction Lines */}
            <DataTable
                className="mb-6"
                minWidth={500}
                columns={[
                    t("sourceType"),
                    t("documentId"),
                    { label: t("taxAmount"), align: "end" },
                ]}
                toolbar={
                    <div className="flex items-center gap-2">
                        <Icon name="receipt_long" className="text-ink-muted" />
                        <h2 className="font-bold text-ink">{t("lines")}</h2>
                        <span className="ml-auto rounded-pill bg-surface-muted px-2 py-1 text-xs font-medium text-ink-faint">
                            {t("lineCount", { count: lines.length })}
                        </span>
                    </div>
                }
                footer={
                    lines.length > 0 ? (
                        <div className="flex items-center justify-between bg-surface-muted/60 px-6 py-4">
                            <span className="type-card-label">{t("total")}</span>
                            <span className="text-base font-bold text-ink tabular-nums">
                                {formatIDR(lines.reduce((s, l) => s + parseFloat(l.tax_amount), 0))}
                            </span>
                        </div>
                    ) : undefined
                }
            >
                {lines.length === 0 ? (
                    <tr>
                        <td colSpan={3}>
                            <EmptyState
                                compact
                                icon="receipt_long"
                                title={t("linesEmpty")}
                                description={t("linesEmptyHint")}
                            />
                        </td>
                    </tr>
                ) : (
                    lines.map((line) => {
                        const isKnownSource = line.source_type === 'invoice' || line.source_type === 'bill'
                        const taxAmt = parseFloat(line.tax_amount)
                        return (
                            <tr key={line.id}>
                                <td>
                                    <StatusPill
                                        tone={
                                            line.source_type === 'invoice'
                                                ? 'teal'
                                                : line.source_type === 'bill'
                                                    ? 'orange'
                                                    : 'neutral'
                                        }
                                    >
                                        <span className="capitalize">
                                            {isKnownSource ? t(`sources.${line.source_type}`) : line.source_type}
                                        </span>
                                    </StatusPill>
                                </td>
                                <td className="font-mono text-sm text-ink-secondary">
                                    #{line.source_id}
                                </td>
                                <td className="text-right font-semibold text-ink tabular-nums">
                                    {formatIDR(taxAmt)}
                                </td>
                            </tr>
                        )
                    })
                )}
            </DataTable>

            {confirmDialog}
        </div>
    )
}
