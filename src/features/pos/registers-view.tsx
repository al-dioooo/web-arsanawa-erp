"use client"

import { toast } from "sonner"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { DataTable } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { Icon } from "@/components/ui/icon"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StatusPill } from "@/components/ui/status-pill"
import { TableStateRow } from "@/components/ui/table-state-row"
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
    const t = useTranslations("pos.registers")
    const rootT = useTranslations()
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

    const loadErrorFallback = t("loadError")
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
            form.id ? t("updated") : t("created"),
        ).then(() => setForm(EMPTY_FORM))
    }

    const branchName = (id: number) => branches.find((b) => b.id === id)?.name ?? t("branchRef", { id })

    return (
        <div className="grid gap-6">
            {confirmDialog}
            <PosPageHeader
                title={t("title")}
                subtitle={t("subtitle")}
                hasCompany={!!activeCompanyId}
                isLoading={isLoading}
            />

            <div className="grid items-start gap-6 xl:grid-cols-[1fr_380px]">
                <DataTable
                    columns={[
                        t("columns.name"),
                        t("columns.code"),
                        t("columns.branch"),
                        t("columns.status"),
                        { label: t("columns.actions"), align: "end" },
                    ]}
                    minWidth={560}
                    toolbar={
                        <h2 className="type-section flex items-center gap-2">
                            <Icon name="storefront" className="text-brand-ink" />
                            <span>{t("listTitle", { count: registers.length })}</span>
                        </h2>
                    }
                >
                    {registers.map((register) => (
                        <tr key={register.id}>
                            <td className="px-6 py-4 font-bold text-ink">{register.name}</td>
                            <td>
                                <code className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-xs font-semibold text-brand-ink">
                                    {register.code}
                                </code>
                            </td>
                            <td>{branchName(register.branch_id)}</td>
                            <td>
                                <StatusPill tone={register.is_active ? "green" : "neutral"}>
                                    {register.is_active ? t("active") : t("inactive")}
                                </StatusPill>
                            </td>
                            <td className="text-end">
                                <div className="flex justify-end gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={rootT("common.edit")}
                                        onClick={() => editRegister(register)}
                                    >
                                        <Icon name="edit" size={16} />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={rootT("common.delete")}
                                        disabled={isLoading}
                                        onClick={async () => {
                                            const ok = await confirm({
                                                title: t("deleteTitle", { name: register.name }),
                                                message: t("deleteMessage"),
                                                confirmLabel: t("deleteConfirm"),
                                                danger: true,
                                            })
                                            if (ok) {
                                                void runMutation(
                                                    () => deleteRegister(requestOptions!, register.id),
                                                    t("deleted"),
                                                )
                                            }
                                        }}
                                    >
                                        <Icon name="delete" size={16} className="text-error" />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    <TableStateRow
                        isLoading={isLoading && registers.length === 0}
                        count={registers.length}
                        columns={5}
                        emptyMessage={t("empty")}
                    />
                </DataTable>

                <Card as="form" padding="lg" className="flex flex-col gap-4" onSubmit={submitForm}>
                    <div className="flex items-center justify-between border-b border-line pb-3">
                        <h2 className="type-section flex items-center gap-2">
                            <Icon name={form.id ? "edit" : "add"} className="text-brand-ink" />
                            <span>{form.id ? t("form.editTitle") : t("form.newTitle")}</span>
                        </h2>
                        {form.id && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => setForm(EMPTY_FORM)}>
                                {rootT("common.cancel")}
                            </Button>
                        )}
                    </div>
                    <Field
                        label={t("form.name")}
                        value={form.name}
                        onChange={(event) => setForm((cur) => ({ ...cur, name: event.target.value }))}
                        placeholder={t("form.namePlaceholder")}
                        required
                    />
                    <Field
                        label={t("form.code")}
                        value={form.code}
                        onChange={(event) => setForm((cur) => ({ ...cur, code: event.target.value }))}
                        placeholder={t("form.codePlaceholder")}
                        required
                    />
                    <SearchableSelect
                        label={t("form.branch")}
                        value={form.branch_id}
                        onChange={(val) => setForm((cur) => ({ ...cur, branch_id: String(val) }))}
                        required
                        options={branches.map((branch) => ({ value: branch.id, label: branch.name }))}
                        placeholder={t("form.selectBranch")}
                    />
                    <SearchableSelect
                        label={t("form.cashAccount")}
                        value={form.cash_account_id}
                        onChange={(val) => setForm((cur) => ({ ...cur, cash_account_id: String(val) }))}
                        options={accounts.map((account) => ({
                            value: account.id,
                            label: `${account.code} · ${account.name}`,
                        }))}
                        placeholder={t("form.none")}
                    />
                    <label className="flex items-center gap-2 text-sm font-medium text-ink-secondary">
                        <input
                            type="checkbox"
                            checked={form.is_active}
                            onChange={(event) => setForm((cur) => ({ ...cur, is_active: event.target.checked }))}
                            className="h-4 w-4 rounded-sm accent-brand"
                        />
                        {t("form.active")}
                    </label>
                    <Button
                        type="submit"
                        size="xl"
                        disabled={isLoading || !form.name || !form.code || !form.branch_id}
                        className="w-full"
                    >
                        {form.id ? t("form.save") : t("form.create")}
                    </Button>
                </Card>
            </div>
        </div>
    )
}
