import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/api-client"

// --- Types ---

export type PaymentAllocation = {
    id?: number
    payment_id?: number
    invoice_id?: number | null
    bill_id?: number | null
    amount: string
    created_at?: string
    updated_at?: string
}

export type Payment = {
    id: number
    company_id: number
    branch_id: number | null
    payment_number: string
    partner_id: number
    payment_type: 'inbound' | 'outbound'
    payment_date: string
    payment_method: string
    amount: string
    currency_id: number
    exchange_rate: number
    cash_account_id: number
    status: 'draft' | 'posted' | 'void'
    notes: string | null
    journal_entry_id: number | null
    created_by: number | null
    updated_by: number | null
    partner?: {
        id: number
        name: string
    }
    allocations?: PaymentAllocation[]
}

export type PaymentFilters = {
    partner_id?: number
    payment_type?: Payment['payment_type'] | ''
    status?: Payment['status'] | ''
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

// --- Hooks ---

export function usePayments(
    companyId: number | null,
    filters: PaymentFilters | Payment['payment_type'] = {},
) {
    const normalizedFilters: PaymentFilters = typeof filters === "string"
        ? { payment_type: filters }
        : filters

    return useQuery({
        queryKey: ['finance', 'payments', companyId, normalizedFilters],
        queryFn: () => apiRequest<{ payments: Payment[] }>(
            `/api/v1/finance/payments${queryString(normalizedFilters)}`,
        ).then(res => res.data?.payments || []),
        enabled: !!companyId,
    })
}

export function usePayment(id: string | null) {
    return useQuery({
        queryKey: ['finance', 'payment', id],
        queryFn: () => apiRequest<{ payment: Payment }>(`/api/v1/finance/payments/${id}`).then(res => res.data?.payment || null),
        enabled: !!id,
    })
}

export function useCreatePayment() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: Partial<Payment>) => apiRequest<{ payment: Payment }>('/api/v1/finance/payments', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        onSuccess: (res, vars, context: { companyId?: number } | undefined) => {
            const companyId = res.data?.payment?.company_id || context?.companyId
            if (companyId) {
                queryClient.invalidateQueries({ queryKey: ['finance', 'payments', companyId] })
            } else {
                queryClient.invalidateQueries({ queryKey: ['finance', 'payments'] })
            }
        }
    })
}

export function usePostPayment() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => apiRequest<{ payment: Payment }>(`/api/v1/finance/payments/${id}/post`, {
            method: 'POST'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'payments'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'payment'] })
            // Invalidate invoices/bills since allocations affect their amount_paid
            queryClient.invalidateQueries({ queryKey: ['finance', 'invoices'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'invoice'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'bills'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'bill'] })
        }
    })
}

export function useVoidPayment() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => apiRequest<{ payment: Payment }>(`/api/v1/finance/payments/${id}/void`, {
            method: 'POST'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'payments'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'payment'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'invoices'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'invoice'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'bills'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'bill'] })
        }
    })
}
