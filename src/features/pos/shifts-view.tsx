"use client"

import { toast } from "sonner"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { Icon } from "@/components/ui/icon"
import { Modal } from "@/components/ui/modal"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StatusPill } from "@/components/ui/status-pill"
import { TableStateRow } from "@/components/ui/table-state-row"
import { useSession } from "@/features/auth/session-provider"
import { PosPageHeader } from "@/features/pos/components/pos-page-header"
import {
    closeShift,
    listRegisters,
    listShifts,
    openShift,
    type PosRequestOptions,
} from "@/features/pos/pos-api"
import type { Register, Shift } from "@/features/pos/pos-types"
import { formatCurrency, toNumber } from "@/lib/money"
import { formatDateTimeID } from "@/lib/format"
import { cn } from "@/lib/utils"

export function ShiftsView() {
    const t = useTranslations("pos.shifts")
    const rootT = useTranslations()
    const { token, activeCompanyId } = useSession()
    const [shifts, setShifts] = useState<Shift[]>([])
    const [registers, setRegisters] = useState<Register[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const [openForm, setOpenForm] = useState<{ register_id: string; opening_float: string; notes: string } | null>(null)
    const [closeTarget, setCloseTarget] = useState<Shift | null>(null)
    const [countedCash, setCountedCash] = useState("")
    const [closeNotes, setCloseNotes] = useState("")

    const requestOptions = useMemo<PosRequestOptions | null>(() => {
        if (!token || !activeCompanyId) return null
        return { token, companyId: activeCompanyId }
    }, [token, activeCompanyId])

    const loadErrorFallback = t("loadError")
    const refreshData = useCallback(async () => {
        if (!requestOptions) return
        setIsLoading(true)
        try {
            const [loadedShifts, loadedRegisters] = await Promise.all([
                listShifts(requestOptions),
                listRegisters(requestOptions),
            ])
            setShifts(loadedShifts)
            setRegisters(loadedRegisters)
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : loadErrorFallback)
        } finally {
            setIsLoading(false)
        }
    }, [requestOptions, loadErrorFallback])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (active) void refreshData()
        })
        return () => {
            active = false
        }
    }, [refreshData])

    async function runMutation(callback: () => Promise<unknown>, successMessage: string) {
        if (!requestOptions) return
        setIsLoading(true)
        try {
            await callback()
            toast.success(successMessage)
            await refreshData()
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : rootT("common.requestFailed"))
        } finally {
            setIsLoading(false)
        }
    }

    const registerName = useCallback(
        (id: number) => registers.find((r) => r.id === id)?.name ?? t("registerRef", { id }),
        [registers, t],
    )

    const closeVariance = closeTarget
        ? toNumber(countedCash) - toNumber(closeTarget.expected_cash ?? closeTarget.opening_float)
        : 0

    return (
        <div className="grid gap-6">
            <PosPageHeader
                title={t("title")}
                subtitle={t("subtitle")}
                hasCompany={!!activeCompanyId}
                isLoading={isLoading}
                actions={
                    <Button
                        type="button"
                        size="xl"
                        disabled={!registers.length}
                        onClick={() =>
                            setOpenForm({ register_id: "", opening_float: "", notes: "" })
                        }
                    >
                        <Icon name="add" size={18} />
                        {t("openShift")}
                    </Button>
                }
            />

            <DataTable
                columns={[
                    t("columns.register"),
                    t("columns.status"),
                    t("columns.opened"),
                    t("columns.openingFloat"),
                    t("columns.countedVariance"),
                    { label: t("columns.actions"), align: "end" },
                ]}
                minWidth={720}
                toolbar={
                    <h2 className="type-section flex items-center gap-2">
                        <Icon name="history" className="text-brand-ink" />
                        <span>{t("listTitle", { count: shifts.length })}</span>
                    </h2>
                }
            >
                {shifts.map((shift) => (
                    <tr key={shift.id}>
                        <td className="px-6 py-4 font-bold text-ink">
                            {registerName(shift.register_id)}
                        </td>
                        <td>
                            <StatusPill tone={shift.status === "open" ? "green" : "neutral"}>
                                {shift.status === "open" ? t("status.open") : t("status.closed")}
                            </StatusPill>
                        </td>
                        <td>{shift.opened_at ? formatDateTimeID(shift.opened_at) : "-"}</td>
                        <td className="tabular-nums">{formatCurrency(shift.opening_float)}</td>
                        <td className="tabular-nums">
                            {shift.status === "closed" ? (
                                <>
                                    {formatCurrency(shift.counted_cash)}
                                    <span
                                        className={cn(
                                            "ms-2 text-xs font-semibold",
                                            toNumber(shift.cash_variance) === 0
                                                ? "text-ink-faint"
                                                : toNumber(shift.cash_variance) > 0
                                                  ? "text-success-strong"
                                                  : "text-error-strong",
                                        )}
                                    >
                                        ({toNumber(shift.cash_variance) > 0 ? "+" : ""}
                                        {formatCurrency(shift.cash_variance)})
                                    </span>
                                </>
                            ) : (
                                <span className="text-ink-faint">-</span>
                            )}
                        </td>
                        <td className="text-end">
                            {shift.status === "open" ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setCloseTarget(shift)
                                        setCountedCash("")
                                        setCloseNotes("")
                                    }}
                                >
                                    {t("close")}
                                </Button>
                            ) : (
                                <span className="text-xs text-ink-faint">-</span>
                            )}
                        </td>
                    </tr>
                ))}
                <TableStateRow
                    isLoading={isLoading && shifts.length === 0}
                    count={shifts.length}
                    columns={6}
                    emptyMessage={t("empty")}
                />
            </DataTable>

            {/* Open shift dialog */}
            <Modal
                open={openForm !== null}
                onClose={() => setOpenForm(null)}
                title={t("openDialog.title")}
                description={t("openDialog.description")}
                footer={
                    <>
                        <Button type="button" variant="outline" size="xl" onClick={() => setOpenForm(null)}>
                            {rootT("common.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            form="open-shift-form"
                            size="xl"
                            disabled={isLoading || !openForm?.register_id || openForm?.opening_float === ""}
                        >
                            {t("openDialog.submit")}
                        </Button>
                    </>
                }
            >
                {openForm && (
                    <form
                        id="open-shift-form"
                        className="grid gap-4"
                        onSubmit={(event) => {
                            event.preventDefault()
                            void runMutation(
                                () =>
                                    openShift(requestOptions!, {
                                        register_id: Number(openForm.register_id),
                                        opening_float: toNumber(openForm.opening_float),
                                        notes: openForm.notes || undefined,
                                    }),
                                t("openSuccess"),
                            ).then(() => setOpenForm(null))
                        }}
                    >
                        <SearchableSelect
                            label={t("openDialog.register")}
                            value={openForm.register_id}
                            onChange={(val) => setOpenForm((cur) => (cur ? { ...cur, register_id: String(val) } : cur))}
                            required
                            options={registers.map((r) => ({ value: r.id, label: `${r.name} (${r.code})` }))}
                            placeholder={t("openDialog.selectRegister")}
                        />
                        <Field
                            label={t("openDialog.openingFloat")}
                            type="number"
                            min="0"
                            step="0.01"
                            value={openForm.opening_float}
                            onChange={(event) =>
                                setOpenForm((cur) => (cur ? { ...cur, opening_float: event.target.value } : cur))
                            }
                            placeholder="0"
                            required
                        />
                        <Field
                            label={t("openDialog.notes")}
                            value={openForm.notes}
                            onChange={(event) =>
                                setOpenForm((cur) => (cur ? { ...cur, notes: event.target.value } : cur))
                            }
                            placeholder={t("openDialog.optional")}
                        />
                    </form>
                )}
            </Modal>

            {/* Close shift dialog */}
            <Modal
                open={closeTarget !== null}
                onClose={() => setCloseTarget(null)}
                title={t("closeDialog.title")}
                description={t("closeDialog.description")}
                footer={
                    <>
                        <Button type="button" variant="outline" size="xl" onClick={() => setCloseTarget(null)}>
                            {rootT("common.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            form="close-shift-form"
                            size="xl"
                            disabled={isLoading || countedCash === ""}
                        >
                            {t("closeDialog.submit")}
                        </Button>
                    </>
                }
            >
                {closeTarget && (
                    <form
                        id="close-shift-form"
                        className="grid gap-4"
                        onSubmit={(event) => {
                            event.preventDefault()
                            void runMutation(
                                () =>
                                    closeShift(requestOptions!, closeTarget.id, {
                                        counted_cash: toNumber(countedCash),
                                        notes: closeNotes || undefined,
                                    }),
                                t("closeSuccess"),
                            ).then(() => setCloseTarget(null))
                        }}
                    >
                        <div className="rounded-md bg-surface-muted p-4 text-sm">
                            <div className="flex justify-between py-1">
                                <span className="text-ink-muted">{t("closeDialog.register")}</span>
                                <span className="font-semibold text-ink">{registerName(closeTarget.register_id)}</span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-ink-muted">{t("closeDialog.expectedCash")}</span>
                                <span className="font-semibold text-ink tabular-nums">
                                    {formatCurrency(closeTarget.expected_cash ?? closeTarget.opening_float)}
                                </span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-ink-muted">{t("closeDialog.variance")}</span>
                                <span
                                    className={cn(
                                        "font-bold tabular-nums",
                                        closeVariance === 0
                                            ? "text-ink"
                                            : closeVariance > 0
                                              ? "text-success-strong"
                                              : "text-error-strong",
                                    )}
                                >
                                    {closeVariance > 0 ? "+" : ""}
                                    {formatCurrency(closeVariance)}
                                </span>
                            </div>
                        </div>
                        <Field
                            label={t("closeDialog.countedCash")}
                            type="number"
                            min="0"
                            step="0.01"
                            value={countedCash}
                            onChange={(event) => setCountedCash(event.target.value)}
                            placeholder="0"
                            required
                        />
                        <Field
                            label={t("closeDialog.notes")}
                            value={closeNotes}
                            onChange={(event) => setCloseNotes(event.target.value)}
                            placeholder={t("openDialog.optional")}
                        />
                    </form>
                )}
            </Modal>
        </div>
    )
}
