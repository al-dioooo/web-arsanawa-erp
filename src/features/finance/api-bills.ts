import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/api-client"

// --- Types ---

export type BillLine = {
    id?: number
    bill_id?: number
    description: string
    product_variant_id?: number | null
    expense_account_id: number
    quantity: string
    unit_price: string
    discount: string
    line_subtotal: string
    tax_amount: string
    withholding_amount: string
    line_total: string
    tax_rate_id?: number | null
}

export type Bill = {
    id: number
    company_id: number
    branch_id: number | null
    bill_number: string
    partner_id: number
    currency_id: number | null
    exchange_rate: string
    bill_date: string
    due_date: string
    status: 'draft' | 'posted' | 'partially_paid' | 'paid' | 'void'
    subtotal: string
    discount_total: string
    tax_total: string
    withholding_total: string
    total: string
    amount_paid: string
    notes: string | null
    journal_entry_id: number | null
    created_by: number | null
    updated_by: number | null
    partner?: {
        id: number
        name: string
    }
    lines?: BillLine[]
}

export type APBucket = {
    partner_id: number
    partner_name: string
    current: string
    days_1_30: string
    days_31_60: string
    days_61_90: string
    over_90: string
    total: string
}

// --- Hooks ---

export function useBills(companyId: number | null) {
    return useQuery({
        queryKey: ['finance', 'bills', companyId],
        queryFn: () => apiRequest<{ bills: Bill[] }>('/api/v1/finance/bills').then(res => res.data?.bills || []),
        enabled: !!companyId,
    })
}

export function useBill(id: string | null) {
    return useQuery({
        queryKey: ['finance', 'bill', id],
        queryFn: () => apiRequest<{ bill: Bill }>(`/api/v1/finance/bills/${id}`).then(res => res.data?.bill || null),
        enabled: !!id,
    })
}

export function useCreateBill() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: Partial<Bill>) => apiRequest<{ bill: Bill }>('/api/v1/finance/bills', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        onSuccess: (res, vars, context: { companyId?: number } | undefined) => {
            const companyId = res.data?.bill?.company_id || context?.companyId
            if (companyId) {
                queryClient.invalidateQueries({ queryKey: ['finance', 'bills', companyId] })
            } else {
                queryClient.invalidateQueries({ queryKey: ['finance', 'bills'] })
            }
        }
    })
}

export function usePostBill() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => apiRequest<{ bill: Bill }>(`/api/v1/finance/bills/${id}/post`, {
            method: 'POST'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'bills'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'bill'] })
        }
    })
}

export function useVoidBill() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => apiRequest<{ bill: Bill }>(`/api/v1/finance/bills/${id}/void`, {
            method: 'POST'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'bills'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'bill'] })
        }
    })
}

export function useAPAging(companyId: number | null) {
    return useQuery({
        queryKey: ['finance', 'ap-aging', companyId],
        queryFn: () => apiRequest<{ data: APBucket[] } | APBucket[]>('/api/v1/finance/ap-aging').then(res => Array.isArray(res.data) ? res.data : (('data' in res.data && res.data.data) || []) as APBucket[]),
        enabled: !!companyId,
    })
}
