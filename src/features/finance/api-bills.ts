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

export type BillFilters = {
    status?: Bill['status'] | ''
    start_date?: string
    end_date?: string
    per_page?: number
    page?: number
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

export function useBills(companyId: number | null, filters: BillFilters = {}) {
    // Default to the API's max page size so lists aren't silently capped at 15.
    const effective: BillFilters = { per_page: 100, ...filters }
    return useQuery({
        queryKey: ['finance', 'bills', companyId, effective],
        queryFn: () => apiRequest<{ bills: Bill[] }>(`/api/v1/finance/bills${queryString(effective)}`).then(res => res.data?.bills || []),
        enabled: !!companyId,
    })
}

/**
 * Fetch every page of bills matching the filters, so AP aging sums the whole
 * ledger rather than a single (default 15-row) page.
 */
export async function loadAllBills(filters: BillFilters = {}): Promise<Bill[]> {
    const all: Bill[] = []
    let page = 1
    let lastPage = 1
    do {
        const res = await apiRequest<{ bills: Bill[]; pagination?: { last_page?: number } }>(
            `/api/v1/finance/bills${queryString({ ...filters, per_page: 100, page })}`,
        )
        all.push(...(res.data?.bills ?? []))
        lastPage = res.data?.pagination?.last_page ?? 1
        page += 1
    } while (page <= lastPage)
    return all
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
        queryFn: () => loadAllBills().then(buildAgingBuckets),
        enabled: !!companyId,
    })
}

function buildAgingBuckets(bills: Bill[]): APBucket[] {
    const buckets = new Map<number, APBucket>()
    const today = new Date()

    bills
        .filter((bill) => !["paid", "void"].includes(bill.status))
        .forEach((bill) => {
            const balance = Math.max(
                Number(bill.total ?? 0) - Number(bill.amount_paid ?? 0),
                0,
            )

            if (balance <= 0) return

            const partnerId = bill.partner_id
            const bucket = buckets.get(partnerId) ?? {
                partner_id: partnerId,
                partner_name: bill.partner?.name ?? `Partner #${partnerId}`,
                current: "0",
                days_1_30: "0",
                days_31_60: "0",
                days_61_90: "0",
                over_90: "0",
                total: "0",
            }

            const key = agingKey(bill.due_date, today)
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
