"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Icon } from "@/components/ui/icon"
import { InputDate } from "@/components/ui/input-date"
import { Modal } from "@/components/ui/modal"
import { PageHeader } from "@/components/ui/page-header"
import { SelectDescription } from "@/components/ui/select-description"
import { StatusBadge } from "@/components/ui/status-badge"
import { StatusPill } from "@/components/ui/status-pill"
import { TableStateRow } from "@/components/ui/table-state-row"
import { useSession } from "@/features/auth/session-provider"
import { useTaxReturns, useGenerateTaxReturn, type TaxReturn } from "@/features/finance/api-tax-returns"
import { formatIDR, formatDateID } from "@/lib/format"
import { cn } from "@/lib/utils"

type GenerateForm = {
    tax_type: 'ppn' | 'pph23'
    period_start: string
    period_end: string
}

export default function TaxReturnsPage() {
    const t = useTranslations("finance.taxReturns")
    const router = useRouter()
    const { activeCompanyId } = useSession()
    const { data: taxReturns = [], isLoading } = useTaxReturns(activeCompanyId)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'all' | 'ppn' | 'pph23'>('all')

    const filtered = activeTab === 'all' ? taxReturns : taxReturns.filter(r => r.tax_type === activeTab)

    return (
        <div className="w-full">
            <PageHeader
                eyebrow={t("eyebrow")}
                title={t("title")}
                subtitle={t("subtitle")}
                actions={
                    <Button size="lg" onClick={() => setIsDrawerOpen(true)}>
                        {t("generate")}
                    </Button>
                }
            />

            {/* Summary KPI row */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                {(['all', 'ppn', 'pph23'] as const).map(type => {
                    const subset = type === 'all' ? taxReturns : taxReturns.filter(r => r.tax_type === type)
                    const draftCount = subset.filter(r => r.status === 'draft').length
                    const total = subset.reduce((s, r) => s + parseFloat(r.total_payable), 0)
                    return (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setActiveTab(type)}
                            className={cn(
                                "cursor-pointer rounded-lg bg-surface p-5 text-left shadow-card transition-all",
                                activeTab === type ? "ring-2 ring-brand" : "hover:shadow-card-hover"
                            )}
                        >
                            <div className="type-card-label mb-1">
                                {type === 'all' ? t("allReturns") : t(`types.${type}`)}
                            </div>
                            <div className="type-card-value mb-1 tabular-nums">{formatIDR(total)}</div>
                            <div className="text-sm text-ink-muted">
                                {t("summary", { total: subset.length, draft: draftCount })}
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Tab filter */}
            <div className="mb-4 flex gap-4 border-b border-line">
                {(['all', 'ppn', 'pph23'] as const).map(type => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => setActiveTab(type)}
                        className={cn(
                            "cursor-pointer border-b-2 px-1 py-2 text-sm font-semibold transition-colors",
                            activeTab === type
                                ? "border-brand text-brand-ink"
                                : "border-transparent text-ink-muted hover:text-ink"
                        )}
                    >
                        {type === 'all' ? t("tabs.all") : t(`typeShort.${type}`)}
                    </button>
                ))}
            </div>

            <DataTable
                columns={[
                    t("table.period"),
                    t("table.taxType"),
                    { label: t("table.outputTax"), align: "end" },
                    { label: t("table.inputTax"), align: "end" },
                    { label: t("table.netPayable"), align: "end" },
                    t("table.status"),
                    "",
                ]}
            >
                <TableStateRow
                    isLoading={isLoading}
                    count={filtered.length}
                    columns={7}
                    emptyMessage={t("empty")}
                />
                {filtered.map((ret) => (
                    <TaxReturnRow key={ret.id} ret={ret} onClick={() => router.push(`/finance/tax-returns/${ret.id}`)} />
                ))}
            </DataTable>

            {isDrawerOpen && (
                <GenerateReturnDrawer onClose={() => setIsDrawerOpen(false)} companyId={activeCompanyId} />
            )}
        </div>
    )
}

function TaxReturnRow({ ret, onClick }: { ret: TaxReturn; onClick: () => void }) {
    const t = useTranslations("finance.taxReturns")
    const output = parseFloat(ret.total_output)
    const input = parseFloat(ret.total_input)
    const payable = parseFloat(ret.total_payable)

    return (
        <tr onClick={onClick} className="cursor-pointer">
            <td>
                <div className="font-semibold text-ink">{formatDateID(ret.period_start)}</div>
                <div className="text-xs text-ink-faint">{t("periodTo", { date: formatDateID(ret.period_end) })}</div>
            </td>
            <td>
                <StatusPill tone={ret.tax_type === 'ppn' ? 'teal' : 'orange'}>
                    {t(`typeShort.${ret.tax_type === 'ppn' ? 'ppn' : 'pph23'}`)}
                </StatusPill>
            </td>
            <td className="text-right font-medium text-ink-secondary">{formatIDR(output)}</td>
            <td className="text-right font-medium text-ink-secondary">{formatIDR(input)}</td>
            <td className={cn("text-right font-bold", payable > 0 ? "text-error-strong" : "text-success-strong")}>
                {formatIDR(payable)}
            </td>
            <td>
                <StatusBadge status={ret.status} />
            </td>
            <td className="text-ink-faint">
                <Icon name="chevron_right" className="text-lg" />
            </td>
        </tr>
    )
}

function GenerateReturnDrawer({ onClose, companyId }: { onClose: () => void; companyId: number | null }) {
    const t = useTranslations("finance.taxReturns.drawer")
    const tToast = useTranslations("finance.taxReturns.toast")
    const tCommon = useTranslations("common")
    const generateReturn = useGenerateTaxReturn()
    const router = useRouter()

    const thisMonth = new Date()
    const firstDay = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString().split('T')[0]
    const lastDay = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0).toISOString().split('T')[0]

    const { register, handleSubmit, watch, formState: { errors } } = useForm<GenerateForm>({
        defaultValues: {
            tax_type: 'ppn',
            period_start: firstDay,
            period_end: lastDay,
        },
    })
    const taxType = watch("tax_type")

    const onSubmit = (data: GenerateForm) => {
        if (!companyId) return
        generateReturn.mutate(data, {
            onSuccess: (res) => {
                toast.success(tToast("generated"))
                onClose()
                if (res.data?.tax_return?.id) {
                    router.push(`/finance/tax-returns/${res.data.tax_return.id}`)
                }
            },
            onError: (err: Error) => {
                toast.error(err?.message || tToast("generateFailed"))
            },
        })
    }

    return (
        <Modal
            open
            onClose={onClose}
            variant="drawer"
            size="md"
            title={t("title")}
            description={t("description")}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>{tCommon("cancel")}</Button>
                    <Button onClick={handleSubmit(onSubmit)} disabled={generateReturn.isPending}>
                        {generateReturn.isPending ? t("generating") : t("generate")}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
                <SelectDescription
                    label={t("taxType")}
                    error={errors.tax_type?.message}
                    value={taxType}
                    options={[
                        { value: "ppn", label: "PPN", description: t("typeDescPpn") },
                        { value: "pph23", label: "PPh 23", description: t("typeDescPph23") },
                    ]}
                    {...register("tax_type", { required: t("taxTypeRequired") })}
                />

                <div className="rounded-lg bg-surface-muted p-4">
                    <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-secondary">
                        <Icon name="calendar_month" className="text-base text-ink-faint" />
                        {t("reportingPeriod")}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <InputDate
                            label={t("periodStart")}
                            error={errors.period_start?.message}
                            {...register("period_start", { required: t("startRequired") })}
                        />
                        <InputDate
                            label={t("periodEnd")}
                            error={errors.period_end?.message}
                            {...register("period_end", { required: t("endRequired") })}
                        />
                    </div>
                </div>

                <div className="rounded-lg bg-warning-soft p-4 text-sm text-warning-strong">
                    <div className="flex gap-2">
                        <Icon name="info" className="mt-0.5 shrink-0 text-base" />
                        <p>{t("info")}</p>
                    </div>
                </div>
            </form>
        </Modal>
    )
}
