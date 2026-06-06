import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest, jsonBody } from "@/lib/api-client"
import type { ApiRequestOptions } from "@/lib/api-client"

// --- Types ---

export type COAAccount = {
    id: number
    company_id: number
    parent_id: number | null
    code: string
    name: string
    type: string
    normal_balance: 'debit' | 'credit'
    depth: number
    is_postable: boolean
    currency_id: number | null
    is_active: boolean
    children?: COAAccount[]
}

export type AccountingPeriod = {
    id: number
    company_id: number
    name: string
    start_date: string
    end_date: string
    status: 'open' | 'closed'
    closed_at: string | null
}

export type TaxRate = {
    id: number
    company_id: number
    name: string
    type: 'ppn' | 'pph'
    rate: string
    is_active: boolean
}

export type AccountMapping = {
    id: number
    company_id: number
    key: string
    account_id: number
}

export type FinanceDashboardSummary = {
    counters: {
        ar_outstanding: string
        ap_outstanding: string
        pending_approvals: number
        draft_invoices: number
        draft_bills: number
    }
    recent_activity: Array<{
        type: "invoice" | "bill"
        id: number
        number: string
        date: string | null
        total: string
        status: string
    }>
    income_expense_series: Array<{
        date: string
        income: number
        expense: number
    }>
}

export type FinanceDashboardFilters = {
    start_date?: string
    end_date?: string
}

function queryString(filters: Record<string, string | number | null | undefined>): string {
    const params = new URLSearchParams()

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            params.set(key, String(value))
        }
    })

    const query = params.toString()
    return query ? `?${query}` : ""
}

export function loadFinanceDashboardSummary(
    filters: FinanceDashboardFilters = {},
    options: ApiRequestOptions = {},
) {
    return apiRequest<FinanceDashboardSummary>(`/api/v1/finance/dashboard${queryString(filters)}`, {}, options).then(
        (res) => res.data,
    )
}

export function useFinanceDashboardSummary(companyId: number | null, filters: FinanceDashboardFilters = {}) {
    return useQuery({
        queryKey: ["finance", "dashboard", companyId, filters],
        queryFn: () => loadFinanceDashboardSummary(filters),
        enabled: !!companyId,
    })
}

// --- Hooks ---

// 1. COA
export function useCOA(companyId: number | null) {
    return useQuery({
        queryKey: ['finance', 'accounts', companyId],
        queryFn: () => apiRequest<{ accounts: COAAccount[] }>('/api/v1/finance/accounts').then(res => res.data?.accounts || []),
        enabled: !!companyId,
    })
}

export function useCreateAccount() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: Partial<COAAccount>) => apiRequest<COAAccount>('/api/v1/finance/accounts', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        onSuccess: (res, vars, context: { companyId?: number } | undefined) => {
            const companyId = res.data?.company_id || context?.companyId
            if (companyId) {
                queryClient.invalidateQueries({ queryKey: ['finance', 'accounts', companyId] })
            } else {
                queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] })
            }
        }
    })
}

export function getAccount(id: number) {
    return apiRequest<{ account: COAAccount }>(`/api/v1/finance/accounts/${id}`).then(
        (res) => res.data.account,
    )
}

export function updateAccount(id: number, data: Partial<COAAccount>) {
    return apiRequest<{ account: COAAccount }>(`/api/v1/finance/accounts/${id}`, {
        method: "PATCH",
        body: jsonBody(data),
    }).then((res) => res.data.account)
}

export function deleteAccount(id: number) {
    return apiRequest<null>(`/api/v1/finance/accounts/${id}`, { method: "DELETE" })
}

export function useAccount(id: number | null) {
    return useQuery({
        queryKey: ["finance", "account", id],
        queryFn: () => getAccount(id as number),
        enabled: Boolean(id),
    })
}

export function useUpdateAccount() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<COAAccount> }) => updateAccount(id, data),
        onSuccess: (account) => {
            void queryClient.invalidateQueries({ queryKey: ["finance", "accounts"] })
            void queryClient.invalidateQueries({ queryKey: ["finance", "account", account.id] })
        },
    })
}

export function useDeleteAccount() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteAccount,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["finance", "accounts"] })
        },
    })
}

// 2. Periods
export function usePeriods(companyId: number | null) {
    return useQuery({
        queryKey: ['finance', 'periods', companyId],
        queryFn: () => apiRequest<{ periods: AccountingPeriod[] }>('/api/v1/finance/periods').then(res => res.data?.periods || []),
        enabled: !!companyId,
    })
}

export function useCreatePeriod() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: Partial<AccountingPeriod>) => apiRequest<AccountingPeriod>('/api/v1/finance/periods', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'periods'] })
        }
    })
}

export function useClosePeriod() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => apiRequest<AccountingPeriod>(`/api/v1/finance/periods/${id}/close`, {
            method: 'POST'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'periods'] })
        }
    })
}

export function useReopenPeriod() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => apiRequest<AccountingPeriod>(`/api/v1/finance/periods/${id}/reopen`, {
            method: 'POST'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'periods'] })
        }
    })
}

// 3. Tax Rates
export function useTaxRates(companyId: number | null) {
    return useQuery({
        queryKey: ['finance', 'tax-rates', companyId],
        queryFn: () => apiRequest<{ tax_rates: TaxRate[] }>('/api/v1/finance/tax-rates').then(res => res.data?.tax_rates || []),
        enabled: !!companyId,
    })
}

export function useCreateTaxRate() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: Partial<TaxRate>) => apiRequest<TaxRate>('/api/v1/finance/tax-rates', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'tax-rates'] })
        }
    })
}

export function getTaxRate(id: number) {
    return apiRequest<{ tax_rate: TaxRate }>(`/api/v1/finance/tax-rates/${id}`).then(
        (res) => res.data.tax_rate,
    )
}

export function updateTaxRate(id: number, data: Partial<TaxRate>) {
    return apiRequest<{ tax_rate: TaxRate }>(`/api/v1/finance/tax-rates/${id}`, {
        method: "PATCH",
        body: jsonBody(data),
    }).then((res) => res.data.tax_rate)
}

export function deleteTaxRate(id: number) {
    return apiRequest<null>(`/api/v1/finance/tax-rates/${id}`, { method: "DELETE" })
}

export function useTaxRate(id: number | null) {
    return useQuery({
        queryKey: ["finance", "tax-rate", id],
        queryFn: () => getTaxRate(id as number),
        enabled: Boolean(id),
    })
}

export function useUpdateTaxRate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<TaxRate> }) => updateTaxRate(id, data),
        onSuccess: (taxRate) => {
            void queryClient.invalidateQueries({ queryKey: ["finance", "tax-rates"] })
            void queryClient.invalidateQueries({ queryKey: ["finance", "tax-rate", taxRate.id] })
        },
    })
}

export function useDeleteTaxRate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteTaxRate,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["finance", "tax-rates"] })
        },
    })
}

// 4. Account Mappings
export function useAccountMappings(companyId: number | null) {
    return useQuery({
        queryKey: ['finance', 'account-mappings', companyId],
        queryFn: () => apiRequest<{ account_mappings: AccountMapping[] }>('/api/v1/finance/account-mappings').then(res => res.data?.account_mappings || []),
        enabled: !!companyId,
    })
}

export function useUpdateAccountMappings() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (mappings: Record<string, number>) => apiRequest<{ success: boolean }>('/api/v1/finance/account-mappings', {
            method: 'PUT',
            body: JSON.stringify({ mappings })
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'account-mappings'] })
        }
    })
}
