"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/features/finance/components/page-header"
import { useSession } from "@/features/auth/session-provider"
import { useAccountMappings, useUpdateAccountMappings, useCOA, type COAAccount } from "@/features/finance/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

const MAPPING_KEYS = [
    "ar_account",
    "ap_account",
    "ppn_in_account",
    "ppn_out_account",
    "retained_earnings",
    "cash_discount",
] as const

export default function AccountMappingsPage() {
    const t = useTranslations("finance.accountMappings")
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
                toast.success(t("saveSuccess"))
            },
            onError: (err: Error) => {
                toast.error(err?.message || t("saveError"))
            }
        })
    }

    const isLoading = isLoadingMappings || isLoadingAccounts

    // Flatten tree and filter postable accounts for dropdowns
    const postableAccounts = flattenAccounts(accounts).filter(a => a.is_postable)
    const accountOptions = [
        { value: "", label: t("selectAccount") },
        ...postableAccounts.map(a => ({ value: String(a.id), label: `${a.code} - ${a.name}` }))
    ]

    return (
        <div className="w-full max-w-4xl">
            <PageHeader
                title={t("title")}
                subtitle={t("subtitle")}
                primaryAction={{
                    label: updateMappings.isPending ? t("saving") : t("save"),
                    onClick: handleSave,
                    disabled: isLoading || updateMappings.isPending
                }}
            />

            <Card padding="lg">
                {isLoading ? (
                    <div className="flex flex-col gap-6" aria-hidden="true">
                        {Array.from({ length: 4 }).map((_, row) => (
                            <Skeleton key={row} className="h-12 rounded-lg" />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {MAPPING_KEYS.map((key) => (
                            <div key={key} className="flex items-start gap-8 border-b border-line py-3 last:border-0 last:pb-0">
                                <div className="w-1/2">
                                    <h3 className="font-semibold text-ink">{t(`fields.${key}.label`)}</h3>
                                    <p className="mt-1 text-sm text-ink-muted">{t(`fields.${key}.description`)}</p>
                                    <div className="mt-1 inline-block rounded-sm bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-ink-faint">
                                        {key}
                                    </div>
                                </div>
                                <div className="w-1/2">
                                    <SearchableSelect
                                        value={formState[key] || ""}
                                        onChange={(val) => setFormState(prev => ({ ...prev, [key]: String(val) }))}
                                        options={accountOptions}
                                        placeholder={t("selectPlaceholder")}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <div className="mt-6 flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={isLoading || updateMappings.isPending}
                    className="px-8"
                >
                    {updateMappings.isPending ? t("saving") : t("save")}
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
