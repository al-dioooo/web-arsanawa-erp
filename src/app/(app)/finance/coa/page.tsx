"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { DataTable } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { Icon } from "@/components/ui/icon"
import { Modal } from "@/components/ui/modal"
import { PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StatusBadge } from "@/components/ui/status-badge"
import { TableStateRow } from "@/components/ui/table-state-row"
import { useSession } from "@/features/auth/session-provider"
import {
    useCOA,
    useCreateAccount,
    useDeleteAccount,
    useUpdateAccount,
    type COAAccount,
} from "@/features/finance/api"

type AccountFormData = {
    parent_id: string
    code: string
    name: string
    type: string
    normal_balance: "debit" | "credit"
    is_postable: boolean
}

export default function COAPage() {
    const t = useTranslations("finance.coa")
    const tCommon = useTranslations("common")
    const { activeCompanyId } = useSession()
    const { data: accounts = [], isLoading, isError, error, refetch } = useCOA(activeCompanyId)
    const updateAccount = useUpdateAccount()
    const deleteAccount = useDeleteAccount()
    const [confirm, confirmDialog] = useConfirm()
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)

    // Compute flat list for the table by flattening the tree
    const flatAccounts = flattenAccounts(accounts)

    const handleDelete = async (account: COAAccount) => {
        const ok = await confirm({
            title: t("deleteConfirm.title", { name: account.name }),
            message: t("deleteConfirm.message"),
            confirmLabel: tCommon("delete"),
            cancelLabel: tCommon("cancel"),
            danger: true,
        })
        if (ok) deleteAccount.mutate(account.id)
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
                    t("table.code"),
                    t("table.name"),
                    t("table.type"),
                    t("table.balance"),
                    t("table.postable"),
                    t("table.status"),
                    t("table.actions"),
                ]}
            >
                <TableStateRow
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    count={flatAccounts.length}
                    columns={7}
                    emptyMessage={t("empty")}
                    onRetry={() => refetch()}
                />
                {flatAccounts.map((account) => (
                    <tr key={account.id}>
                        <td>
                            <div className="flex items-center">
                                <span style={{ marginLeft: `${account.depth * 1.5}rem` }} className="font-mono font-medium text-ink">
                                    {account.code}
                                </span>
                            </div>
                        </td>
                        <td className="font-semibold text-ink">{account.name}</td>
                        <td className="capitalize text-ink-secondary">{account.type.replace('_', ' ')}</td>
                        <td className="capitalize text-ink-secondary">{account.normal_balance}</td>
                        <td>
                            {account.is_postable ? (
                                <Icon name="check_circle" className="text-brand-ink" />
                            ) : (
                                <Icon name="cancel" className="text-ink-faint" />
                            )}
                        </td>
                        <td>
                            <StatusBadge status={account.is_active ? "active" : "inactive"} />
                        </td>
                        <td>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() =>
                                        updateAccount.mutate({
                                            id: account.id,
                                            data: { is_active: !account.is_active },
                                        })
                                    }
                                >
                                    {account.is_active ? t("deactivate") : t("activate")}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => void handleDelete(account)}
                                >
                                    {tCommon("delete")}
                                </Button>
                            </div>
                        </td>
                    </tr>
                ))}
            </DataTable>

            {isDrawerOpen && (
                <AccountDrawer
                    onClose={() => setIsDrawerOpen(false)}
                    accounts={flatAccounts}
                />
            )}
            {confirmDialog}
        </div>
    )
}

function AccountDrawer({ onClose, accounts }: { onClose: () => void, accounts: COAAccount[] }) {
    const t = useTranslations("finance.coa.drawer")
    const tToast = useTranslations("finance.coa.toast")
    const tCommon = useTranslations("common")
    const { activeCompanyId } = useSession()
    const createAccount = useCreateAccount()

    const { register, handleSubmit, control, formState: { errors } } = useForm<AccountFormData>({
        defaultValues: {
            parent_id: "",
            code: "",
            name: "",
            type: "asset",
            normal_balance: "debit",
            is_postable: true
        }
    })

    const onSubmit = (data: AccountFormData) => {
        if (!activeCompanyId) return

        createAccount.mutate({
            company_id: activeCompanyId,
            parent_id: data.parent_id ? parseInt(data.parent_id) : null,
            code: data.code,
            name: data.name,
            type: data.type,
            normal_balance: data.normal_balance,
            is_postable: data.is_postable,
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

    const parentOptions = [
        { value: "", label: t("noParent") },
        ...accounts.map(a => ({ value: String(a.id), label: `${a.code} - ${a.name}` }))
    ]

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
                    <Button onClick={handleSubmit(onSubmit)} disabled={createAccount.isPending}>
                        {createAccount.isPending ? t("saving") : t("save")}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
                <Controller
                    name="parent_id"
                    control={control}
                    render={({ field }) => (
                        <SearchableSelect
                            label={t("parent")}
                            options={parentOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t("parentPlaceholder")}
                        />
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <Field
                        label={t("code")}
                        {...register("code", { required: t("codeRequired") })}
                        error={errors.code?.message}
                    />
                    <Field
                        label={t("name")}
                        {...register("name", { required: t("nameRequired") })}
                        error={errors.name?.message}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Controller
                        name="type"
                        control={control}
                        render={({ field }) => (
                            <SearchableSelect
                                label={t("type")}
                                options={[
                                    { value: "asset", label: t("types.asset") },
                                    { value: "liability", label: t("types.liability") },
                                    { value: "equity", label: t("types.equity") },
                                    { value: "revenue", label: t("types.revenue") },
                                    { value: "expense", label: t("types.expense") },
                                ]}
                                value={field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />

                    <Controller
                        name="normal_balance"
                        control={control}
                        render={({ field }) => (
                            <SearchableSelect
                                label={t("normalBalance")}
                                options={[
                                    { value: "debit", label: t("balances.debit") },
                                    { value: "credit", label: t("balances.credit") }
                                ]}
                                value={field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </div>

                <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-lg bg-surface-muted/50 p-4 transition-colors hover:bg-surface-muted">
                    <input type="checkbox" className="size-5 rounded accent-brand" {...register("is_postable")} />
                    <div>
                        <div className="text-sm font-semibold text-ink">{t("postable")}</div>
                        <div className="mt-0.5 text-xs text-ink-muted">{t("postableHint")}</div>
                    </div>
                </label>
            </form>
        </Modal>
    )
}

function flattenAccounts(nodes: COAAccount[]): COAAccount[] {
    const flat: COAAccount[] = []
    function traverse(nodeList: COAAccount[]) {
        for (const node of nodeList) {
            flat.push(node)
            if (node.children) {
                traverse(node.children)
            }
        }
    }
    traverse(nodes)
    return flat
}
