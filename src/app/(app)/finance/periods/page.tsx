"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { DataTable } from "@/components/ui/data-table"
import { DatePicker } from "@/components/ui/date-picker"
import { Field } from "@/components/ui/field"
import { Modal } from "@/components/ui/modal"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { TableStateRow } from "@/components/ui/table-state-row"
import { useSession } from "@/features/auth/session-provider"
import { usePeriods, useCreatePeriod, useClosePeriod, useReopenPeriod } from "@/features/finance/api"
import { formatDateID } from "@/lib/format"

type PeriodFormData = {
    name: string
    start_date: string
    end_date: string
}

export default function PeriodsPage() {
    const t = useTranslations("finance.periods")
    const tCommon = useTranslations("common")
    const { activeCompanyId } = useSession()
    const { data: periods = [], isLoading } = usePeriods(activeCompanyId)
    const closePeriod = useClosePeriod()
    const reopenPeriod = useReopenPeriod()
    const [confirm, confirmDialog] = useConfirm()

    const [isDrawerOpen, setIsDrawerOpen] = useState(false)

    const handleClose = async (id: number) => {
        const ok = await confirm({
            title: t("closeConfirm.title"),
            message: t("closeConfirm.message"),
            confirmLabel: t("close"),
            cancelLabel: tCommon("cancel"),
            danger: true,
        })
        if (ok) {
            closePeriod.mutate(id, {
                onSuccess: () => toast.success(t("toast.closed")),
                onError: (err: Error) => toast.error(err?.message || t("toast.closeFailed"))
            })
        }
    }

    const handleReopen = async (id: number) => {
        const ok = await confirm({
            title: t("reopenConfirm.title"),
            message: t("reopenConfirm.message"),
            confirmLabel: t("reopen"),
            cancelLabel: tCommon("cancel"),
        })
        if (ok) {
            reopenPeriod.mutate(id, {
                onSuccess: () => toast.success(t("toast.reopened")),
                onError: (err: Error) => toast.error(err?.message || t("toast.reopenFailed"))
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
                    <Button size="lg" onClick={() => setIsDrawerOpen(true)}>
                        {t("new")}
                    </Button>
                }
            />

            <DataTable
                columns={[
                    t("table.name"),
                    t("table.startDate"),
                    t("table.endDate"),
                    t("table.closedAt"),
                    t("table.status"),
                    t("table.actions"),
                ]}
            >
                <TableStateRow
                    isLoading={isLoading}
                    count={periods.length}
                    columns={6}
                    emptyMessage={t("empty")}
                />
                {periods.map((period) => (
                    <tr key={period.id}>
                        <td className="font-semibold text-ink">{period.name}</td>
                        <td className="text-ink-secondary">{formatDateID(period.start_date)}</td>
                        <td className="text-ink-secondary">{formatDateID(period.end_date)}</td>
                        <td className="text-ink-secondary">
                            {period.closed_at ? formatDateID(period.closed_at) : "-"}
                        </td>
                        <td>
                            <StatusBadge status={period.status === 'open' ? 'active' : 'closed'} />
                        </td>
                        <td>
                            {period.status === 'open' ? (
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => void handleClose(period.id)}
                                >
                                    {t("close")}
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => void handleReopen(period.id)}
                                >
                                    {t("reopen")}
                                </Button>
                            )}
                        </td>
                    </tr>
                ))}
            </DataTable>

            {isDrawerOpen && (
                <PeriodDrawer
                    onClose={() => setIsDrawerOpen(false)}
                />
            )}
            {confirmDialog}
        </div>
    )
}

function PeriodDrawer({ onClose }: { onClose: () => void }) {
    const t = useTranslations("finance.periods.drawer")
    const tToast = useTranslations("finance.periods.toast")
    const tCommon = useTranslations("common")
    const { activeCompanyId } = useSession()
    const createPeriod = useCreatePeriod()

    const { register, handleSubmit, control, formState: { errors } } = useForm<PeriodFormData>({
        defaultValues: {
            name: "",
            start_date: "",
            end_date: ""
        }
    })

    const onSubmit = (data: PeriodFormData) => {
        if (!activeCompanyId) return

        createPeriod.mutate({
            company_id: activeCompanyId,
            name: data.name,
            start_date: data.start_date,
            end_date: data.end_date,
            status: 'open'
        }, {
            onSuccess: () => {
                toast.success(tToast("created"))
                onClose()
            },
            onError: (err: Error) => {
                toast.error(err?.message || tToast("createFailed"))
            }
        })
    }

    return (
        <Modal
            open
            onClose={onClose}
            variant="drawer"
            size="md"
            title={t("title")}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>{tCommon("cancel")}</Button>
                    <Button onClick={handleSubmit(onSubmit)} disabled={createPeriod.isPending}>
                        {createPeriod.isPending ? t("saving") : t("save")}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
                <Field
                    label={t("name")}
                    placeholder={t("namePlaceholder")}
                    {...register("name", { required: t("nameRequired") })}
                    error={errors.name?.message}
                />

                <div className="grid grid-cols-2 gap-4">
                    <Controller
                        name="start_date"
                        control={control}
                        rules={{ required: t("startRequired") }}
                        render={({ field }) => (
                            <DatePicker
                                label={t("startDate")}
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.start_date?.message}
                            />
                        )}
                    />

                    <Controller
                        name="end_date"
                        control={control}
                        rules={{ required: t("endRequired") }}
                        render={({ field }) => (
                            <DatePicker
                                label={t("endDate")}
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.end_date?.message}
                            />
                        )}
                    />
                </div>
            </form>
        </Modal>
    )
}
