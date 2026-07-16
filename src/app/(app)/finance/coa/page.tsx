"use client"

import { useState } from "react"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { DataTable } from "@/features/finance/components/data-table"
import { TableStateRow } from "@/features/finance/components/table-state-row"
import { StatusBadge } from "@/features/finance/components/status-badge"
import { useSession } from "@/features/auth/session-provider"
import {
    useCOA,
    useCreateAccount,
    useDeleteAccount,
    useUpdateAccount,
    type COAAccount,
} from "@/features/finance/api"
import { EnterTransition } from "@/components/ui/enter"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { useForm, Controller } from "react-hook-form"
import { toast } from "sonner"

type AccountFormData = {
    parent_id: string
    code: string
    name: string
    type: string
    normal_balance: "debit" | "credit"
    is_postable: boolean
}

export default function COAPage() {
    const { activeCompanyId } = useSession()
    const { data: accounts = [], isLoading, isError, error, refetch } = useCOA(activeCompanyId)
    const updateAccount = useUpdateAccount()
    const deleteAccount = useDeleteAccount()
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)

    // Compute flat list for the table by flattening the tree
    const flatAccounts = flattenAccounts(accounts)

    return (
        <div className="w-full">
            <PageHeader
                title="Chart of Accounts"
                primaryAction={{
                    label: "+ New Account",
                    onClick: () => setIsDrawerOpen(true)
                }}
            />

            <FilterBar>
                <div className="flex-1 text-sm text-navy-500">
                    Manage your company&apos;s chart of accounts.
                </div>
            </FilterBar>

            <DataTable columns={["Code", "Name", "Type", "Balance", "Postable", "Status", "Actions"]}>
                <TableStateRow
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    count={flatAccounts.length}
                    columns={7}
                    emptyMessage="No accounts found. Create one to get started."
                    loadingMessage="Loading accounts..."
                    onRetry={() => refetch()}
                />
                {flatAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-navy-50/50 transition-colors">
                        <td className="px-6 py-4">
                            <div className="flex items-center">
                                <span style={{ marginLeft: `${account.depth * 1.5}rem` }} className="font-mono text-navy-900 font-medium">
                                    {account.code}
                                </span>
                            </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-navy-900">{account.name}</td>
                        <td className="px-6 py-4 text-navy-700 capitalize">{account.type.replace('_', ' ')}</td>
                        <td className="px-6 py-4 text-navy-700 capitalize">{account.normal_balance}</td>
                        <td className="px-6 py-4">
                            {account.is_postable ? (
                                <Icon name="check_circle" className="text-teal-600" />
                            ) : (
                                <Icon name="cancel" className="text-navy-300" />
                            )}
                        </td>
                        <td className="px-6 py-4">
                            <StatusBadge status={account.is_active ? "active" : "inactive"} />
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        updateAccount.mutate({
                                            id: account.id,
                                            data: { is_active: !account.is_active },
                                        })
                                    }
                                    className="rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-bold text-navy-700 transition-colors hover:bg-navy-100 cursor-pointer"
                                >
                                    {account.is_active ? "Deactivate" : "Activate"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => deleteAccount.mutate(account.id)}
                                    className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 cursor-pointer"
                                >
                                    Delete
                                </button>
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
        </div>
    )
}

function AccountDrawer({ onClose, accounts }: { onClose: () => void, accounts: COAAccount[] }) {
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
                toast.success("Account created successfully")
                onClose()
            },
            onError: (err: Error) => {
                toast.error(err?.message || "Failed to create account")
            }
        })
    }

    const parentOptions = [
        { value: "", label: "-- No Parent (Root) --" },
        ...accounts.map(a => ({ value: String(a.id), label: `${a.code} - ${a.name}` }))
    ]

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy-900/40 backdrop-blur-sm">
            <EnterTransition from="right" distance="100%" fade={false} duration={0.2} className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100">
                    <h2 className="text-lg font-bold text-navy-900">New Account</h2>
                    <button onClick={onClose} className="p-2 text-navy-400 hover:text-navy-700 hover:bg-navy-50 rounded-full transition-colors cursor-pointer">
                        <Icon name="close" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                    <Controller
                        name="parent_id"
                        control={control}
                        render={({ field }) => (
                            <SearchableSelect
                                label="Parent Account"
                                options={parentOptions}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select parent account..."
                            />
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="Account Code"
                            {...register("code", { required: "Code is required" })}
                            error={errors.code?.message}
                        />
                        <Field
                            label="Account Name"
                            {...register("name", { required: "Name is required" })}
                            error={errors.name?.message}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Controller
                            name="type"
                            control={control}
                            render={({ field }) => (
                                <SearchableSelect
                                    label="Account Type"
                                    options={[
                                        { value: "asset", label: "Asset" },
                                        { value: "liability", label: "Liability" },
                                        { value: "equity", label: "Equity" },
                                        { value: "revenue", label: "Revenue" },
                                        { value: "expense", label: "Expense" },
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
                                    label="Normal Balance"
                                    options={[
                                        { value: "debit", label: "Debit" },
                                        { value: "credit", label: "Credit" }
                                    ]}
                                    value={field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        />
                    </div>

                    <label className="flex items-center gap-3 p-4 border border-navy-100 rounded-xl hover:bg-navy-50 cursor-pointer transition-colors mt-2">
                        <input type="checkbox" className="w-5 h-5 rounded border-navy-300 text-teal-600 focus:ring-teal-500" {...register("is_postable")} />
                        <div>
                            <div className="font-semibold text-navy-900 text-sm">Postable Account</div>
                            <div className="text-xs text-navy-500 mt-0.5">Transactions can be posted directly to this account.</div>
                        </div>
                    </label>
                </form>

                <div className="p-6 border-t border-navy-100 bg-navy-50/50 flex gap-3 justify-end">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit(onSubmit)} disabled={createAccount.isPending} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
                        {createAccount.isPending ? "Saving..." : "Save Account"}
                    </Button>
                </div>
            </EnterTransition>
        </div>
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
