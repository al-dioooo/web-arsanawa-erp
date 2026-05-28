"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Icon } from "@/components/ui/icon"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StatusPill } from "@/components/ui/status-pill"
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

export function ShiftsView() {
    const { token, activeCompanyId } = useSession()
    const [shifts, setShifts] = useState<Shift[]>([])
    const [registers, setRegisters] = useState<Register[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const [openForm, setOpenForm] = useState<{ register_id: string; opening_float: string; notes: string } | null>(null)
    const [closeTarget, setCloseTarget] = useState<Shift | null>(null)
    const [countedCash, setCountedCash] = useState("")
    const [closeNotes, setCloseNotes] = useState("")

    const requestOptions = useMemo<PosRequestOptions | null>(() => {
        if (!token || !activeCompanyId) return null
        return { token, companyId: activeCompanyId }
    }, [token, activeCompanyId])

    const refreshData = useCallback(async () => {
        if (!requestOptions) return
        setIsLoading(true)
        setError(null)
        try {
            const [loadedShifts, loadedRegisters] = await Promise.all([
                listShifts(requestOptions),
                listRegisters(requestOptions),
            ])
            setShifts(loadedShifts)
            setRegisters(loadedRegisters)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to load shifts.")
        } finally {
            setIsLoading(false)
        }
    }, [requestOptions])

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
        setError(null)
        setMessage(null)
        try {
            await callback()
            setMessage(successMessage)
            await refreshData()
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "The request failed.")
        } finally {
            setIsLoading(false)
        }
    }

    const registerName = useCallback(
        (id: number) => registers.find((r) => r.id === id)?.name ?? `Register #${id}`,
        [registers],
    )

    const closeVariance = closeTarget
        ? toNumber(countedCash) - toNumber(closeTarget.expected_cash ?? closeTarget.opening_float)
        : 0

    return (
        <div className="grid gap-6">
            <PosPageHeader
                title="Cashier Shifts"
                subtitle="Open and close cashier shifts. A shift must be open before sales can be rung up on a register."
                hasCompany={!!activeCompanyId}
                isLoading={isLoading}
                message={message}
                error={error}
                actions={
                    <Button
                        type="button"
                        size="xl"
                        disabled={!registers.length}
                        onClick={() =>
                            setOpenForm({ register_id: "", opening_float: "", notes: "" })
                        }
                        className="bg-teal-700 hover:bg-teal-800 text-white"
                    >
                        <Icon name="add" size={18} />
                        Open shift
                    </Button>
                }
            />

            <div className="rounded-2xl border border-navy-100 bg-white p-6">
                <h2 className="mb-4 flex items-center gap-2 border-b border-navy-50 pb-3 text-lg font-bold text-navy-900 font-display">
                    <Icon name="history" className="text-teal-700" />
                    <span>Shifts ({shifts.length})</span>
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
                        <thead>
                            <tr className="bg-navy-50/30 text-xs font-bold uppercase tracking-wider text-navy-500">
                                <th className="border-b border-navy-100 px-4 py-3 font-display">Register</th>
                                <th className="border-b border-navy-100 px-4 py-3 font-display">Status</th>
                                <th className="border-b border-navy-100 px-4 py-3 font-display">Opened</th>
                                <th className="border-b border-navy-100 px-4 py-3 font-display">Opening float</th>
                                <th className="border-b border-navy-100 px-4 py-3 font-display">Counted / Variance</th>
                                <th className="border-b border-navy-100 px-4 py-3 font-display text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shifts.map((shift) => (
                                <tr key={shift.id} className="transition-colors hover:bg-navy-50/20">
                                    <td className="border-b border-navy-100/50 px-4 py-3 font-bold text-navy-900">
                                        {registerName(shift.register_id)}
                                    </td>
                                    <td className="border-b border-navy-100/50 px-4 py-3">
                                        <StatusPill tone={shift.status === "open" ? "green" : "neutral"}>
                                            {shift.status}
                                        </StatusPill>
                                    </td>
                                    <td className="border-b border-navy-100/50 px-4 py-3 text-navy-600 font-medium">
                                        {shift.opened_at ? new Date(shift.opened_at).toLocaleString() : "-"}
                                    </td>
                                    <td className="border-b border-navy-100/50 px-4 py-3 text-navy-700 font-medium">
                                        {formatCurrency(shift.opening_float)}
                                    </td>
                                    <td className="border-b border-navy-100/50 px-4 py-3 text-navy-700 font-medium">
                                        {shift.status === "closed" ? (
                                            <>
                                                {formatCurrency(shift.counted_cash)}
                                                <span
                                                    className={`ml-2 text-xs font-semibold ${
                                                        toNumber(shift.cash_variance) === 0
                                                            ? "text-navy-400"
                                                            : toNumber(shift.cash_variance) > 0
                                                              ? "text-emerald-700"
                                                              : "text-rose-700"
                                                    }`}
                                                >
                                                    ({toNumber(shift.cash_variance) > 0 ? "+" : ""}
                                                    {formatCurrency(shift.cash_variance)})
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-navy-300">-</span>
                                        )}
                                    </td>
                                    <td className="border-b border-navy-100/50 px-4 py-3 text-right">
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
                                                Close
                                            </Button>
                                        ) : (
                                            <span className="text-navy-300 text-xs">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {shifts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="bg-navy-50/10 py-8 text-center font-medium text-navy-400">
                                        No shifts yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Open shift dialog */}
            <Dialog
                open={openForm !== null}
                onClose={() => setOpenForm(null)}
                title="Open shift"
                description="Select a register and record the opening cash float."
                footer={
                    <>
                        <Button type="button" variant="outline" size="xl" onClick={() => setOpenForm(null)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="open-shift-form"
                            size="xl"
                            disabled={isLoading || !openForm?.register_id || openForm?.opening_float === ""}
                            className="bg-teal-700 hover:bg-teal-800 text-white"
                        >
                            Open shift
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
                                "Shift opened.",
                            ).then(() => setOpenForm(null))
                        }}
                    >
                        <SearchableSelect
                            label="Register"
                            value={openForm.register_id}
                            onChange={(val) => setOpenForm((cur) => (cur ? { ...cur, register_id: String(val) } : cur))}
                            required
                            options={registers.map((r) => ({ value: r.id, label: `${r.name} (${r.code})` }))}
                            placeholder="Select register"
                        />
                        <Field
                            label="Opening float"
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
                            label="Notes"
                            value={openForm.notes}
                            onChange={(event) =>
                                setOpenForm((cur) => (cur ? { ...cur, notes: event.target.value } : cur))
                            }
                            placeholder="Optional"
                        />
                    </form>
                )}
            </Dialog>

            {/* Close shift dialog */}
            <Dialog
                open={closeTarget !== null}
                onClose={() => setCloseTarget(null)}
                title="Close shift"
                description="Count the cash drawer. The variance against expected cash is shown below."
                footer={
                    <>
                        <Button type="button" variant="outline" size="xl" onClick={() => setCloseTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="close-shift-form"
                            size="xl"
                            disabled={isLoading || countedCash === ""}
                            className="bg-teal-700 hover:bg-teal-800 text-white"
                        >
                            Close shift
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
                                "Shift closed.",
                            ).then(() => setCloseTarget(null))
                        }}
                    >
                        <div className="rounded-xl border border-navy-100 bg-navy-50/30 p-4 text-sm">
                            <div className="flex justify-between py-1">
                                <span className="text-navy-500">Register</span>
                                <span className="font-semibold text-navy-900">{registerName(closeTarget.register_id)}</span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-navy-500">Expected cash</span>
                                <span className="font-semibold text-navy-900">
                                    {formatCurrency(closeTarget.expected_cash ?? closeTarget.opening_float)}
                                </span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-navy-500">Variance</span>
                                <span
                                    className={`font-bold ${
                                        closeVariance === 0
                                            ? "text-navy-900"
                                            : closeVariance > 0
                                              ? "text-emerald-700"
                                              : "text-rose-700"
                                    }`}
                                >
                                    {closeVariance > 0 ? "+" : ""}
                                    {formatCurrency(closeVariance)}
                                </span>
                            </div>
                        </div>
                        <Field
                            label="Counted cash"
                            type="number"
                            min="0"
                            step="0.01"
                            value={countedCash}
                            onChange={(event) => setCountedCash(event.target.value)}
                            placeholder="0"
                            required
                        />
                        <Field
                            label="Notes"
                            value={closeNotes}
                            onChange={(event) => setCloseNotes(event.target.value)}
                            placeholder="Optional"
                        />
                    </form>
                )}
            </Dialog>
        </div>
    )
}
