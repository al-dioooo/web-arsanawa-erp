import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/api-client"
import { COAAccount, AccountingPeriod } from "./api"

export type JournalLine = {
    id?: number
    journal_entry_id?: number
    account_id: number
    account?: COAAccount
    description: string | null
    debit: number
    credit: number
    foreign_debit?: number
    foreign_credit?: number
}

export type JournalEntry = {
    id: number
    company_id: number
    branch_id: number | null
    entry_number: string
    entry_date: string
    accounting_period_id: number
    period?: AccountingPeriod
    description: string | null
    reference_type: string | null
    reference_id: number | null
    currency_id: number | null
    exchange_rate: number
    status: 'draft' | 'posted' | 'void'
    posted_at: string | null
    posted_by: number | null
    created_by: number | null
    updated_by: number | null
    lines?: JournalLine[]
}

export type TrialBalanceItem = {
    account_id: number
    code: string
    name: string
    type: string
    normal_balance: 'debit' | 'credit'
    debit: number
    credit: number
}

export type LedgerItem = {
    id: number
    journal_entry_id: number
    entry_number: string
    entry_date: string
    description: string
    debit: number
    credit: number
    balance: number
}

export type AccountLedgerReport = {
    account: {
        id: number
        code: string
        name: string
        type: string
        normal_balance: 'debit' | 'credit'
    }
    ledger: LedgerItem[]
}

// --- Hooks ---

export function useJournalEntries(companyId: number | null, params?: { status?: string; per_page?: number }) {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.per_page) queryParams.append('per_page', String(params.per_page))

    const queryString = queryParams.toString()
    const url = `/api/v1/finance/journal-entries${queryString ? `?${queryString}` : ''}`

    return useQuery({
        queryKey: ['finance', 'journal-entries', companyId, params],
        queryFn: () => apiRequest<{ journal_entries: JournalEntry[] }>(url).then(res => res.data?.journal_entries || []),
        enabled: !!companyId,
    })
}

export function useJournalEntry(id: string | null) {
    return useQuery({
        queryKey: ['finance', 'journal-entry', id],
        queryFn: () => apiRequest<{ journal_entry: JournalEntry }>(`/api/v1/finance/journal-entries/${id}`).then(res => res.data?.journal_entry || null),
        enabled: !!id,
    })
}

export function useCreateJournalEntry() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: Partial<JournalEntry>) => apiRequest<{ journal_entry: JournalEntry }>('/api/v1/finance/journal-entries', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        onSuccess: (res, vars, context: { companyId?: number } | undefined) => {
            const companyId = res.data?.journal_entry?.company_id || context?.companyId
            if (companyId) {
                queryClient.invalidateQueries({ queryKey: ['finance', 'journal-entries', companyId] })
            } else {
                queryClient.invalidateQueries({ queryKey: ['finance', 'journal-entries'] })
            }
        }
    })
}

export function usePostJournalEntry() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => apiRequest<{ journal_entry: JournalEntry }>(`/api/v1/finance/journal-entries/${id}/post`, {
            method: 'POST'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'journal-entries'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'journal-entry'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'trial-balance'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'account-ledger'] })
        }
    })
}

export function useVoidJournalEntry() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => apiRequest<{ journal_entry: JournalEntry }>(`/api/v1/finance/journal-entries/${id}/void`, {
            method: 'POST'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'journal-entries'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'journal-entry'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'trial-balance'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'account-ledger'] })
        }
    })
}

export function useTrialBalance(companyId: number | null, periodId: number | null) {
    const url = `/api/v1/finance/reports/trial-balance?accounting_period_id=${periodId}`
    return useQuery({
        queryKey: ['finance', 'trial-balance', companyId, periodId],
        queryFn: () => apiRequest<{ trial_balance: TrialBalanceItem[] }>(url).then(res => res.data?.trial_balance || []),
        enabled: !!companyId && !!periodId,
    })
}

export function useAccountLedger(companyId: number | null, accountId: number | null, periodId: number | null) {
    const url = `/api/v1/finance/reports/account-ledger?account_id=${accountId}&accounting_period_id=${periodId}`
    return useQuery({
        queryKey: ['finance', 'account-ledger', companyId, accountId, periodId],
        queryFn: () => apiRequest<AccountLedgerReport>(url).then(res => res.data || null),
        enabled: !!companyId && !!accountId && !!periodId,
    })
}
