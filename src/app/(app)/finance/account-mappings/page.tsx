"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/features/finance/components/page-header"
import { FilterBar } from "@/features/finance/components/filter-bar"
import { useSession } from "@/features/auth/session-provider"
import { useAccountMappings, useUpdateAccountMappings, useCOA, type COAAccount } from "@/features/finance/api"
import { Button } from "@/components/ui/button"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { toast } from "sonner"

const MAPPING_KEYS = [
    { key: "ar_account", label: "Accounts Receivable (Piutang Usaha)", description: "Default account for customer invoices" },
    { key: "ap_account", label: "Accounts Payable (Hutang Usaha)", description: "Default account for vendor bills" },
    { key: "ppn_in_account", label: "PPN In (Pajak Masukan)", description: "Account for input VAT on purchases" },
    { key: "ppn_out_account", label: "PPN Out (Pajak Keluaran)", description: "Account for output VAT on sales" },
    { key: "retained_earnings", label: "Retained Earnings (Laba Ditahan)", description: "Account for closing year-end profit/loss" },
    { key: "cash_discount", label: "Cash Discount (Diskon Tunai)", description: "Account for early payment discounts" }
]

export default function AccountMappingsPage() {
    const { activeCompanyId } = useSession()
    const { data: mappings = [], isLoading: isLoadingMappings } = useAccountMappings(activeCompanyId)
    const { data: accounts = [], isLoading: isLoadingAccounts } = useCOA(activeCompanyId)
    const updateMappings = useUpdateAccountMappings()

    const [formState, setFormState] = useState<Record<string, string>>({})

    // Populate form state from server data
    useEffect(() => {
        if (mappings.length > 0) {
            const initial: Record<string, string> = {}
            for (const map of mappings) {
                initial[map.key] = String(map.account_id)
            }
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFormState(initial)
        }
    }, [mappings])

    const handleSave = () => {
        // Convert to Record<string, number> for API
        const payload: Record<string, number> = {}
        for (const [key, val] of Object.entries(formState)) {
            if (val) {
                payload[key] = parseInt(val)
            }
        }

        updateMappings.mutate(payload, {
            onSuccess: () => {
                toast.success("Account mappings saved successfully")
            },
            onError: (err: Error) => {
                toast.error(err?.message || "Failed to save account mappings")
            }
        })
    }

    const isLoading = isLoadingMappings || isLoadingAccounts

    // Flatten tree and filter postable accounts for dropdowns
    const postableAccounts = flattenAccounts(accounts).filter(a => a.is_postable)
    const accountOptions = [
        { value: "", label: "-- Select Account --" },
        ...postableAccounts.map(a => ({ value: String(a.id), label: `${a.code} - ${a.name}` }))
    ]

    return (
        <div className="w-full max-w-4xl">
            <PageHeader
                title="Account Mappings"
                primaryAction={{
                    label: updateMappings.isPending ? "Saving..." : "Save Mappings",
                    onClick: handleSave,
                    disabled: isLoading || updateMappings.isPending
                }}
            />

            <FilterBar>
                <div className="flex-1 text-sm text-navy-500">
                    Map standard system transactions to your specific chart of accounts.
                </div>
            </FilterBar>

            <div className="bg-white rounded-xl border border-navy-100 shadow-sm p-6">
                {isLoading ? (
                    <div className="text-center py-8 text-navy-500">Loading mappings...</div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {MAPPING_KEYS.map((item) => (
                            <div key={item.key} className="flex items-start gap-8 py-3 border-b border-navy-50 last:border-0 last:pb-0">
                                <div className="w-1/2">
                                    <h3 className="font-semibold text-navy-900">{item.label}</h3>
                                    <p className="text-sm text-navy-500 mt-1">{item.description}</p>
                                    <div className="mt-1 text-xs font-mono text-navy-400 bg-navy-50 inline-block px-1.5 py-0.5 rounded">
                                        {item.key}
                                    </div>
                                </div>
                                <div className="w-1/2">
                                    <SearchableSelect
                                        value={formState[item.key] || ""}
                                        onChange={(val) => setFormState(prev => ({ ...prev, [item.key]: String(val) }))}
                                        options={accountOptions}
                                        placeholder="Select a postable account..."
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="mt-6 flex justify-end">
                <Button 
                    onClick={handleSave} 
                    disabled={isLoading || updateMappings.isPending}
                    className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm px-8"
                >
                    {updateMappings.isPending ? "Saving..." : "Save Mappings"}
                </Button>
            </div>
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
