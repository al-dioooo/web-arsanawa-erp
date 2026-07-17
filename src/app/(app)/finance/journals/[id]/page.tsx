"use client"

import Link from "next/link"
import { use } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardLabel } from "@/components/ui/card"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { DataTable } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import { TableStateRow } from "@/components/ui/table-state-row"
import { useJournalEntry, usePostJournalEntry, useVoidJournalEntry } from "@/features/finance/api-journals"
import { formatIDR, formatDateID } from "@/lib/format"

export default function JournalDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const t = useTranslations("finance.journals.detail")
    const tCommon = useTranslations("common")
    const [confirm, confirmDialog] = useConfirm()

    const { data: journal, isLoading, refetch } = useJournalEntry(id)
    const postJournal = usePostJournalEntry()
    const voidJournal = useVoidJournalEntry()

    if (isLoading) {
        return (
            <div className="grid w-full max-w-5xl gap-6" aria-busy="true">
                <Skeleton className="h-9 w-72" />
                <SkeletonCard />
                <Skeleton className="h-64 w-full rounded-lg" />
            </div>
        )
    }

    if (!journal) {
        return (
            <div className="w-full max-w-5xl">
                <EmptyState
                    icon="menu_book"
                    title={t("notFound")}
                    description={t("notFoundHint")}
                    action={
                        <Link href="/finance/journals" className={buttonVariants({ variant: "secondary" })}>
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
        postJournal.mutate(journal.id, {
            onSuccess: () => {
                toast.success(t("postSuccess"))
                refetch()
            },
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
        voidJournal.mutate(journal.id, {
            onSuccess: () => {
                toast.success(t("voidSuccess"))
                refetch()
            },
            onError: (err: Error) => toast.error(err?.message || t("voidError")),
        })
    }

    const lines = journal.lines ?? []
    const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0)
    const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0)

    return (
        <div className="w-full max-w-5xl">
            <PageHeader
                backHref="/finance/journals"
                backLabel={tCommon("back")}
                eyebrow={t("eyebrow")}
                title={t("title", { number: journal.entry_number || `JE-${journal.id}` })}
                status={<StatusBadge status={journal.status} />}
                actions={
                    <>
                        {journal.status === "posted" && (
                            <Button
                                variant="outline"
                                onClick={handleVoid}
                                disabled={postJournal.isPending || voidJournal.isPending}
                            >
                                {voidJournal.isPending ? t("voiding") : t("void")}
                            </Button>
                        )}
                        {journal.status === "draft" && (
                            <Button
                                onClick={handlePost}
                                disabled={postJournal.isPending || voidJournal.isPending}
                            >
                                {postJournal.isPending ? t("posting") : t("post")}
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
                        <h2 className="mb-1 text-xl font-bold text-ink">
                            {journal.entry_number || t("draftHeading", { id: journal.id })}
                        </h2>
                        <div className="text-sm text-ink-muted">
                            {t("period")}:{" "}
                            <span className="font-semibold text-ink-secondary">
                                {journal.period?.name ||
                                    t("periodFallback", { id: journal.accounting_period_id })}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-6 text-end">
                        <div>
                            <CardLabel className="mb-1">{t("entryDate")}</CardLabel>
                            <div className="font-medium text-ink">{formatDateID(journal.entry_date)}</div>
                        </div>
                    </div>
                </Card>

                <DataTable
                    columns={[
                        t("lines.account"),
                        t("lines.description"),
                        { label: t("lines.debit"), align: "end" },
                        { label: t("lines.credit"), align: "end" },
                    ]}
                >
                    <TableStateRow
                        isLoading={false}
                        count={lines.length}
                        columns={4}
                        emptyMessage={t("lines.empty")}
                    />
                    {lines.map((line, idx) => (
                        <tr key={idx}>
                            <td>
                                <div className="font-semibold text-ink">
                                    {line.account ? (
                                        <Link
                                            href={`/finance/journals/account/${line.account.id}`}
                                            className="text-brand-ink hover:underline"
                                        >
                                            {line.account.code} - {line.account.name}
                                        </Link>
                                    ) : (
                                        t("lines.accountFallback", { id: line.account_id })
                                    )}
                                </div>
                            </td>
                            <td>{line.description || "-"}</td>
                            <td className="text-end font-medium text-ink tabular-nums">
                                {line.debit > 0 ? formatIDR(line.debit) : "-"}
                            </td>
                            <td className="text-end font-medium text-ink tabular-nums">
                                {line.credit > 0 ? formatIDR(line.credit) : "-"}
                            </td>
                        </tr>
                    ))}
                    {lines.length > 0 && (
                        <tr className="bg-surface-muted/50 font-bold hover:bg-surface-muted/50">
                            <td colSpan={2} className="text-ink">
                                {t("lines.total")}
                            </td>
                            <td className="text-end text-ink tabular-nums">{formatIDR(totalDebit)}</td>
                            <td className="text-end text-ink tabular-nums">{formatIDR(totalCredit)}</td>
                        </tr>
                    )}
                </DataTable>

                <Card padding="lg">
                    <h3 className="type-card-label mb-2">{t("descriptionTitle")}</h3>
                    <p className="whitespace-pre-wrap text-sm text-ink-secondary">
                        {journal.description || t("noDescription")}
                    </p>
                </Card>
            </div>

            {confirmDialog}
        </div>
    )
}
