import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/api-client"

// --- Types ---

export type TaxReturnLine = {
    id: number
    tax_return_id: number
    source_type: string // 'invoice' | 'bill'
    source_id: number
    tax_amount: string
}

export type TaxReturn = {
    id: number
    company_id: number
    tax_type: 'ppn' | 'pph23'
    period_start: string
    period_end: string
    status: 'draft' | 'finalized'
    total_output: string
    total_input: string
    total_payable: string
    journal_entry_id: number | null
    created_by: number | null
    updated_by: number | null
    lines?: TaxReturnLine[]
}

export type GenerateTaxReturnPayload = {
    tax_type: 'ppn' | 'pph23'
    period_start: string
    period_end: string
}

// --- Hooks ---

export function useTaxReturns(companyId: number | null) {
    return useQuery({
        queryKey: ['finance', 'tax-returns', companyId],
        queryFn: () =>
            apiRequest<{ tax_returns: TaxReturn[] }>('/api/v1/finance/tax-returns').then(
                (res) => res.data?.tax_returns || []
            ),
        enabled: !!companyId,
    })
}

export function useTaxReturn(id: string | null) {
    return useQuery({
        queryKey: ['finance', 'tax-return', id],
        queryFn: () =>
            apiRequest<{ tax_return: TaxReturn }>(`/api/v1/finance/tax-returns/${id}`).then(
                (res) => res.data?.tax_return || null
            ),
        enabled: !!id,
    })
}

export function useGenerateTaxReturn() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: GenerateTaxReturnPayload) =>
            apiRequest<{ tax_return: TaxReturn }>('/api/v1/finance/tax-returns', {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'tax-returns'] })
        },
    })
}

export function useFinalizeTaxReturn() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) =>
            apiRequest<{ tax_return: TaxReturn }>(`/api/v1/finance/tax-returns/${id}/finalize`, {
                method: 'POST',
            }),
        onSuccess: (_res, id) => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'tax-returns'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'tax-return', String(id)] })
        },
    })
}

export function useDeleteTaxReturn() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) =>
            apiRequest<null>(`/api/v1/finance/tax-returns/${id}`, {
                method: 'DELETE',
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'tax-returns'] })
        },
    })
}
