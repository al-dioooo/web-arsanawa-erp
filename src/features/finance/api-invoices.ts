import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/api-client"

// --- Types ---

export type InvoiceLine = {
    id: number
    invoice_id: number
    description: string
    product_variant_id: number | null
    revenue_account_id: number
    quantity: string
    unit_price: string
    discount: string
    line_subtotal: string
    tax_amount: string
    line_total: string
    tax_rate_id: number | null
}

export type Invoice = {
    id: number
    company_id: number
    branch_id: number | null
    invoice_number: string
    partner_id: number
    currency_id: number | null
    exchange_rate: string
    invoice_date: string
    due_date: string
    status: 'draft' | 'posted' | 'partially_paid' | 'paid' | 'void' | 'overdue'
    subtotal: string
    discount_total: string
    tax_total: string
    total: string
    amount_paid: string
    notes: string | null
    journal_entry_id: number | null
    lines?: InvoiceLine[]
    partner?: {
        id: number
        name: string
    }
}

export type AgingBucket = {
    partner_id: number
    partner_name: string
    current: string
    days_1_30: string
    days_31_60: string
    days_61_90: string
    over_90: string
    total: string
}

// --- Mock Data (Temporary) ---
// Since the Partners module is not fully implemented yet, we provide a mock list of partners for the UI.
export function usePartners(companyId: number | null) {
    return useQuery({
        queryKey: ['finance', 'partners', companyId],
        queryFn: async () => {
            return [
                { id: 1, name: "PT. Maju Jaya" },
                { id: 2, name: "CV. Bintang Sentosa" },
                { id: 3, name: "Toko Abadi" },
            ]
        },
        enabled: !!companyId,
    })
}

// --- Hooks ---

export function useInvoices(companyId: number | null) {
    return useQuery({
        queryKey: ['finance', 'invoices', companyId],
        queryFn: () => apiRequest<{ invoices: Invoice[] }>('/api/v1/finance/invoices').then(res => res.data?.invoices || []),
        enabled: !!companyId,
    })
}

export function useInvoice(id: string | null) {
    return useQuery({
        queryKey: ['finance', 'invoice', id],
        queryFn: () => apiRequest<{ invoice: Invoice }>(`/api/v1/finance/invoices/${id}`).then(res => res.data?.invoice || null),
        enabled: !!id,
    })
}

export function useCreateInvoice() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: Partial<Invoice>) => apiRequest<{ invoice: Invoice }>('/api/v1/finance/invoices', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        onSuccess: (res, vars, context: { companyId?: number } | undefined) => {
            const companyId = res.data?.invoice?.company_id || context?.companyId
            if (companyId) {
                queryClient.invalidateQueries({ queryKey: ['finance', 'invoices', companyId] })
            } else {
                queryClient.invalidateQueries({ queryKey: ['finance', 'invoices'] })
            }
        }
    })
}

export function usePostInvoice() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => apiRequest<{ invoice: Invoice }>(`/api/v1/finance/invoices/${id}/post`, {
            method: 'POST'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'invoice'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'invoices'] })
        }
    })
}

export function useVoidInvoice() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => apiRequest<{ invoice: Invoice }>(`/api/v1/finance/invoices/${id}/void`, {
            method: 'POST'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'invoice'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'invoices'] })
        }
    })
}

export function useARAging(companyId: number | null) {
    return useQuery({
        queryKey: ['finance', 'ar-aging', companyId],
        queryFn: () => apiRequest<{ data: AgingBucket[] } | AgingBucket[]>('/api/v1/finance/ar-aging').then(res => Array.isArray(res.data) ? res.data : (('data' in res.data && res.data.data) || []) as AgingBucket[]),
        enabled: !!companyId,
    })
}
