"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { DataTable } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { Modal } from "@/components/ui/modal"
import { PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StatusBadge } from "@/components/ui/status-badge"
import { TableStateRow } from "@/components/ui/table-state-row"
import { useSession } from "@/features/auth/session-provider"
import {
    useCreateTaxRate,
    useDeleteTaxRate,
    useTaxRates,
    useUpdateTaxRate,
} from "@/features/finance/api"
import { cn } from "@/lib/utils"

type TaxRateFormData = {
    name: string
    type: "ppn" | "pph"
    rate: string
}

const TABS = ["ppn", "pph"] as const

export default function TaxRatesPage() {
    const t = useTranslations("finance.taxRates")
    const tCommon = useTranslations("common")
    const { activeCompanyId } = useSession()
    const { data: taxRates = [], isLoading, isError, error, refetch } = useTaxRates(activeCompanyId)
    const updateTaxRate = useUpdateTaxRate()
    const deleteTaxRate = useDeleteTaxRate()
    const [confirm, confirmDialog] = useConfirm()
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<"ppn" | "pph">("ppn")

    const filteredRates = taxRates.filter(rate => rate.type === activeTab)

    const handleDelete = async (rate: (typeof taxRates)[number]) => {
        const ok = await confirm({
            title: t("deleteConfirm.title", { name: rate.name }),
            message: t("deleteConfirm.message"),
            confirmLabel: tCommon("delete"),
            cancelLabel: tCommon("cancel"),
            danger: true,
        })
        if (ok) deleteTaxRate.mutate(rate.id)
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
                    t("table.name"),
                    t("table.type"),
                    t("table.rate"),
                    t("table.status"),
                    t("table.actions"),
                ]}
            >
                <TableStateRow
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    count={filteredRates.length}
                    columns={5}
                    emptyMessage={t("empty", { type: activeTab.toUpperCase() })}
                    onRetry={() => refetch()}
                />
                {filteredRates.map((rate) => (
                    <tr key={rate.id}>
                        <td className="font-semibold text-ink">{rate.name}</td>
                        <td className="font-mono text-sm uppercase text-ink-secondary">{rate.type}</td>
                        <td className="font-bold text-ink">{parseFloat(rate.rate).toString()}%</td>
                        <td>
                            <StatusBadge status={rate.is_active ? 'active' : 'inactive'} />
                        </td>
                        <td>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() =>
                                        updateTaxRate.mutate({
                                            id: rate.id,
                                            data: { is_active: !rate.is_active },
                                        })
                                    }
                                >
                                    {rate.is_active ? t("deactivate") : t("activate")}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => void handleDelete(rate)}
                                >
                                    {tCommon("delete")}
                                </Button>
                            </div>
                        </td>
                    </tr>
                ))}
            </DataTable>

            {isDrawerOpen && (
                <TaxRateDrawer
                    onClose={() => setIsDrawerOpen(false)}
                />
            )}
            {confirmDialog}
        </div>
    )
}

function TaxRateDrawer({ onClose }: { onClose: () => void }) {
    const t = useTranslations("finance.taxRates.drawer")
    const tToast = useTranslations("finance.taxRates.toast")
    const tCommon = useTranslations("common")
    const { activeCompanyId } = useSession()
    const createTaxRate = useCreateTaxRate()

    const { register, handleSubmit, control, formState: { errors } } = useForm<TaxRateFormData>({
        defaultValues: {
            name: "",
            type: "ppn",
            rate: "0.00"
        }
    })

    const onSubmit = (data: TaxRateFormData) => {
        if (!activeCompanyId) return

        createTaxRate.mutate({
            company_id: activeCompanyId,
            name: data.name,
            type: data.type,
            rate: data.rate,
            is_active: true
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
                    <Button onClick={handleSubmit(onSubmit)} disabled={createTaxRate.isPending}>
                        {createTaxRate.isPending ? t("saving") : t("save")}
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
                        name="type"
                        control={control}
                        render={({ field }) => (
                            <SearchableSelect
                                label={t("type")}
                                options={[
                                    { value: "ppn", label: "PPN" },
                                    { value: "pph", label: "PPh" },
                                ]}
                                value={field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />

                    <Field
                        label={t("rate")}
                        type="number"
                        step="0.01"
                        {...register("rate", {
                            required: t("rateRequired"),
                            min: { value: 0, message: t("rateMin") }
                        })}
                        error={errors.rate?.message}
                    />
                </div>
            </form>
        </Modal>
    )
}
