"use client"

import { toast } from "sonner"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { Field } from "@/components/ui/field"
import { Icon } from "@/components/ui/icon"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StatusPill } from "@/components/ui/status-pill"
import { useSession } from "@/features/auth/session-provider"
import { PosPageHeader } from "@/features/pos/components/pos-page-header"
import {
    createRegister,
    deleteRegister,
    listRegisters,
    loadPostableAccounts,
    updateRegister,
    type PosRequestOptions,
    type PostableAccount,
} from "@/features/pos/pos-api"
import type { Register } from "@/features/pos/pos-types"

type RegisterForm = {
    id: number | null
    name: string
    code: string
    branch_id: string
    cash_account_id: string
    is_active: boolean
}

const EMPTY_FORM: RegisterForm = {
    id: null,
    name: "",
    code: "",
    branch_id: "",
    cash_account_id: "",
    is_active: true,
}

export function RegistersView() {
    const { token, activeCompanyId, organizationContext } = useSession()
    const branches = organizationContext?.branches ?? []

    const [confirm, confirmDialog] = useConfirm()
    const [registers, setRegisters] = useState<Register[]>([])
    const [accounts, setAccounts] = useState<PostableAccount[]>([])
    const [form, setForm] = useState<RegisterForm>(EMPTY_FORM)
    const [isLoading, setIsLoading] = useState(false)

    const requestOptions = useMemo<PosRequestOptions | null>(() => {
        if (!token || !activeCompanyId) return null
        return { token, companyId: activeCompanyId }
    }, [token, activeCompanyId])

    const refreshData = useCallback(async () => {
        if (!requestOptions) return
        setIsLoading(true)
        try {
            const [loadedRegisters, loadedAccounts] = await Promise.all([
                listRegisters(requestOptions),
                loadPostableAccounts(requestOptions).catch(() => [] as PostableAccount[]),
            ])
            setRegisters(loadedRegisters)
            setAccounts(loadedAccounts)
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Unable to load registers.")
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
        try {
            await callback()
            toast.success(successMessage)
            await refreshData()
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "The request failed.")
        } finally {
            setIsLoading(false)
        }
    }

    function editRegister(register: Register) {
        setForm({
            id: register.id,
            name: register.name,
            code: register.code,
            branch_id: String(register.branch_id),
            cash_account_id: register.cash_account_id ? String(register.cash_account_id) : "",
            is_active: register.is_active,
        })
    }

    function submitForm(event: React.FormEvent) {
        event.preventDefault()
        const payload = {
            name: form.name,
            code: form.code,
            branch_id: Number(form.branch_id),
            cash_account_id: form.cash_account_id ? Number(form.cash_account_id) : null,
            is_active: form.is_active,
        }
        void runMutation(
            () =>
                form.id
                    ? updateRegister(requestOptions!, form.id, payload)
                    : createRegister(requestOptions!, payload),
            form.id ? "Register updated." : "Register created.",
        ).then(() => setForm(EMPTY_FORM))
    }

    const branchName = (id: number) => branches.find((b) => b.id === id)?.name ?? `Branch #${id}`

    return (
        <div className="grid gap-6">
            {confirmDialog}
            <PosPageHeader
                title="Registers"
                subtitle="Manage POS registers per branch. Each register can be linked to a cash account for settlement."
                hasCompany={!!activeCompanyId}
                isLoading={isLoading}
            />

            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
                <div className="rounded-2xl border border-navy-100 bg-white p-6">
                    <h2 className="mb-4 flex items-center gap-2 border-b border-navy-50 pb-3 text-lg font-bold text-navy-900 font-display">
                        <Icon name="storefront" className="text-teal-700" />
                        <span>Registers ({registers.length})</span>
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left text-sm">
                            <thead>
                                <tr className="bg-navy-50/30 text-xs font-bold uppercase tracking-wider text-navy-500">
                                    <th className="border-b border-navy-100 px-4 py-3 font-display">Name</th>
                                    <th className="border-b border-navy-100 px-4 py-3 font-display">Code</th>
                                    <th className="border-b border-navy-100 px-4 py-3 font-display">Branch</th>
                                    <th className="border-b border-navy-100 px-4 py-3 font-display">Status</th>
                                    <th className="border-b border-navy-100 px-4 py-3 font-display text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registers.map((register) => (
                                    <tr key={register.id} className="transition-colors hover:bg-navy-50/20">
                                        <td className="border-b border-navy-100/50 px-4 py-3 font-bold text-navy-900">
                                            {register.name}
                                        </td>
                                        <td className="border-b border-navy-100/50 px-4 py-3 text-navy-700">
                                            <code className="rounded border border-navy-100 bg-navy-50 px-1.5 py-0.5 text-xs font-semibold text-teal-800">
                                                {register.code}
                                            </code>
                                        </td>
                                        <td className="border-b border-navy-100/50 px-4 py-3 text-navy-700 font-medium">
                                            {branchName(register.branch_id)}
                                        </td>
                                        <td className="border-b border-navy-100/50 px-4 py-3">
                                            <StatusPill tone={register.is_active ? "green" : "neutral"}>
                                                {register.is_active ? "Active" : "Inactive"}
                                            </StatusPill>
                                        </td>
                                        <td className="border-b border-navy-100/50 px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => editRegister(register)}
                                                >
                                                    <Icon name="edit" size={16} />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    disabled={isLoading}
                                                    onClick={async () => {
                                                        const ok = await confirm({
                                                            title: `Delete register “${register.name}”?`,
                                                            message: "This register will be permanently removed.",
                                                            confirmLabel: "Delete register",
                                                            danger: true,
                                                        })
                                                        if (ok) {
                                                            void runMutation(
                                                                () => deleteRegister(requestOptions!, register.id),
                                                                "Register deleted.",
                                                            )
                                                        }
                                                    }}
                                                >
                                                    <Icon name="delete" size={16} className="text-rose-500" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {registers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="bg-navy-50/10 py-8 text-center font-medium text-navy-400">
                                            No registers yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <form className="flex flex-col gap-4 rounded-2xl border border-navy-100 bg-white p-6" onSubmit={submitForm}>
                    <div className="flex items-center justify-between border-b border-navy-50 pb-3">
                        <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900 font-display">
                            <Icon name={form.id ? "edit" : "add"} className="text-teal-700" />
                            <span>{form.id ? "Edit register" : "New register"}</span>
                        </h2>
                        {form.id && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => setForm(EMPTY_FORM)}>
                                Cancel
                            </Button>
                        )}
                    </div>
                    <Field
                        label="Name"
                        value={form.name}
                        onChange={(event) => setForm((cur) => ({ ...cur, name: event.target.value }))}
                        placeholder="e.g. Front Counter"
                        required
                    />
                    <Field
                        label="Code"
                        value={form.code}
                        onChange={(event) => setForm((cur) => ({ ...cur, code: event.target.value }))}
                        placeholder="e.g. REG-01"
                        required
                    />
                    <SearchableSelect
                        label="Branch"
                        value={form.branch_id}
                        onChange={(val) => setForm((cur) => ({ ...cur, branch_id: String(val) }))}
                        required
                        options={branches.map((branch) => ({ value: branch.id, label: branch.name }))}
                        placeholder="Select branch"
                    />
                    <SearchableSelect
                        label="Cash account (optional)"
                        value={form.cash_account_id}
                        onChange={(val) => setForm((cur) => ({ ...cur, cash_account_id: String(val) }))}
                        options={accounts.map((account) => ({
                            value: account.id,
                            label: `${account.code} · ${account.name}`,
                        }))}
                        placeholder="None"
                    />
                    <label className="flex items-center gap-2 text-sm font-medium text-navy-700">
                        <input
                            type="checkbox"
                            checked={form.is_active}
                            onChange={(event) => setForm((cur) => ({ ...cur, is_active: event.target.checked }))}
                            className="h-4 w-4 rounded border-navy-200 text-teal-700 focus:ring-teal-700/30"
                        />
                        Active
                    </label>
                    <Button
                        type="submit"
                        size="xl"
                        disabled={isLoading || !form.name || !form.code || !form.branch_id}
                        className="w-full bg-teal-700 hover:bg-teal-800 text-white"
                    >
                        {form.id ? "Save changes" : "Create register"}
                    </Button>
                </form>
            </div>
        </div>
    )
}
