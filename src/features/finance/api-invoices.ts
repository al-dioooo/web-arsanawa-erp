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

export type PartnerOption = {
    id: number
    company_id: number
    type: "customer" | "supplier" | "both"
    name: string
    code: string | null
    email: string | null
    phone: string | null
    tax_identifier: string | null
    national_id: string | null
    credit_limit: string | null
    transaction_limit: string | null
    status: string
    notes: string | null
}

function queryString(params: Record<string, string | number | null | undefined>): string {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
            search.set(key, String(value))
        }
    })

    const value = search.toString()
    return value ? `?${value}` : ""
}

export function usePartners(companyId: number | null, type?: "customer" | "supplier" | "both") {
    return useQuery({
        queryKey: ['finance', 'partners', companyId, type ?? 'all'],
        queryFn: () =>
            apiRequest<{ partners: PartnerOption[] }>(
                `/api/v1/partners${queryString({ type, status: "active", per_page: 100 })}`,
            ).then(res => res.data?.partners || []),
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
    const invoices = useInvoices(companyId)

    return useQuery({
        queryKey: ['finance', 'ar-aging', companyId],
        queryFn: () => Promise.resolve(buildAgingBuckets(invoices.data ?? [])),
        enabled: !!companyId && invoices.isSuccess,
    })
}

function buildAgingBuckets(invoices: Invoice[]): AgingBucket[] {
    const buckets = new Map<number, AgingBucket>()
    const today = new Date()

    invoices
        .filter((invoice) => !["paid", "void"].includes(invoice.status))
        .forEach((invoice) => {
            const balance = Math.max(
                Number(invoice.total ?? 0) - Number(invoice.amount_paid ?? 0),
                0,
            )

            if (balance <= 0) return

            const partnerId = invoice.partner_id
            const bucket = buckets.get(partnerId) ?? {
                partner_id: partnerId,
                partner_name: invoice.partner?.name ?? `Partner #${partnerId}`,
                current: "0",
                days_1_30: "0",
                days_31_60: "0",
                days_61_90: "0",
                over_90: "0",
                total: "0",
            }

            const key = agingKey(invoice.due_date, today)
            bucket[key] = String(Number(bucket[key]) + balance)
            bucket.total = String(Number(bucket.total) + balance)
            buckets.set(partnerId, bucket)
        })

    return [...buckets.values()]
}

function agingKey(
    dueDateValue: string,
    today: Date,
): "current" | "days_1_30" | "days_31_60" | "days_61_90" | "over_90" {
    const dueDate = new Date(dueDateValue)
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / 86_400_000)

    if (daysOverdue <= 0) return "current"
    if (daysOverdue <= 30) return "days_1_30"
    if (daysOverdue <= 60) return "days_31_60"
    if (daysOverdue <= 90) return "days_61_90"

    return "over_90"
}
