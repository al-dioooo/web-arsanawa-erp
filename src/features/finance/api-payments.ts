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

// --- Hooks ---

export function usePayments(companyId: number | null, paymentType?: 'inbound' | 'outbound') {
    return useQuery({
        queryKey: ['finance', 'payments', companyId, paymentType],
        queryFn: () => {
            const query = paymentType ? `?payment_type=${paymentType}` : ''
            return apiRequest<{ payments: Payment[] }>(`/api/v1/finance/payments${query}`).then(res => res.data?.payments || [])
        },
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
