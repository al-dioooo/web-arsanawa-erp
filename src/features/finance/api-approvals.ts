import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/api-client"
import type { Membership } from "@/lib/types"

// --- Types ---

export type ApprovalMatrix = {
    id: number
    company_id: number
    document_type: 'bill' | 'payment'
    min_amount: string
    max_amount: string
    level: number
    approver_user_id: number
    created_at?: string
    updated_at?: string
}

export type ApprovalAction = {
    id: number
    approval_request_id: number
    level: number
    user_id: number
    action: 'approved' | 'rejected'
    remark: string | null
    acted_at: string
    created_at?: string
    updated_at?: string
    user?: {
        id: number
        name: string
        username: string | null
        email: string
    }
}

export type ApprovalRequest = {
    id: number
    company_id: number
    approvable_type: string
    approvable_id: number
    current_level: number
    status: 'pending' | 'approved' | 'rejected'
    actions?: ApprovalAction[]
    created_at?: string
    updated_at?: string
    approvable?: {
        id: number
        bill_number?: string
        payment_number?: string
        total?: string
        amount?: string
        status: string
    }
}

export type ApprovalRequestsResponse = {
    approval_requests: ApprovalRequest[]
    pagination: {
        current_page: number
        last_page: number
        per_page: number
        total: number
    }
}

// --- Hooks ---

// 1. Approval Matrices CRUD
export function useApprovalMatrices(companyId: number | null) {
    return useQuery({
        queryKey: ['finance', 'approval-matrices', companyId],
        queryFn: () => apiRequest<{ approval_matrices: ApprovalMatrix[] }>('/api/v1/finance/approval-matrices')
            .then(res => res.data?.approval_matrices || []),
        enabled: !!companyId,
    })
}

export function useCreateApprovalMatrix() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: Partial<ApprovalMatrix>) => apiRequest<{ approval_matrix: ApprovalMatrix }>('/api/v1/finance/approval-matrices', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        onSuccess: (res) => {
            const companyId = res.data?.approval_matrix?.company_id
            if (companyId) {
                queryClient.invalidateQueries({ queryKey: ['finance', 'approval-matrices', companyId] })
            } else {
                queryClient.invalidateQueries({ queryKey: ['finance', 'approval-matrices'] })
            }
        }
    })
}

export function useUpdateApprovalMatrix() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, ...data }: { id: number } & Partial<ApprovalMatrix>) => apiRequest<{ approval_matrix: ApprovalMatrix }>(`/api/v1/finance/approval-matrices/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),
        onSuccess: (res) => {
            const companyId = res.data?.approval_matrix?.company_id
            if (companyId) {
                queryClient.invalidateQueries({ queryKey: ['finance', 'approval-matrices', companyId] })
            } else {
                queryClient.invalidateQueries({ queryKey: ['finance', 'approval-matrices'] })
            }
        }
    })
}

export function useDeleteApprovalMatrix() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => apiRequest<null>(`/api/v1/finance/approval-matrices/${id}`, {
            method: 'DELETE'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'approval-matrices'] })
        }
    })
}

// 2. Approval Requests Queue
export function useApprovalRequests(
    companyId: number | null,
    filters: { status?: string; approvable_type?: string; per_page?: number; page?: number } = {}
) {
    return useQuery({
        queryKey: ['finance', 'approval-requests', companyId, filters],
        queryFn: () => {
            const params = new URLSearchParams()
            if (filters.status) params.append('status', filters.status)
            if (filters.approvable_type) params.append('approvable_type', filters.approvable_type)
            if (filters.per_page) params.append('per_page', String(filters.per_page))
            if (filters.page) params.append('page', String(filters.page))

            const queryStr = params.toString() ? `?${params.toString()}` : ''
            return apiRequest<ApprovalRequestsResponse>(`/api/v1/finance/approval-requests${queryStr}`)
                .then(res => res.data || { approval_requests: [], pagination: { current_page: 1, last_page: 1, per_page: 15, total: 0 } })
        },
        enabled: !!companyId,
    })
}

// 3. Act on Approval
export function useActOnApproval() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, action, remark }: { id: number; action: 'approved' | 'rejected'; remark?: string }) => 
            apiRequest<{ approval_request: ApprovalRequest }>(`/api/v1/finance/approval-requests/${id}/act`, {
                method: 'POST',
                body: JSON.stringify({ action, remark })
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'approval-requests'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'bill'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'payment'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'bills'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'payments'] })
        }
    })
}

// 4. Submit for Approval
export function useSubmitBillApproval() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (billId: number) => apiRequest<{ approval_request: ApprovalRequest }>(`/api/v1/finance/bills/${billId}/submit-approval`, {
            method: 'POST'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'bill'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'bills'] })
        }
    })
}

export function useSubmitPaymentApproval() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (paymentId: number) => apiRequest<{ approval_request: ApprovalRequest }>(`/api/v1/finance/payments/${paymentId}/submit-approval`, {
            method: 'POST'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'payment'] })
            queryClient.invalidateQueries({ queryKey: ['finance', 'payments'] })
        }
    })
}

// 5. Fetch Company Memberships (for selecting approvers)
export function useCompanyMembers(companyId: number | null) {
    return useQuery({
        queryKey: ['organization', 'memberships', companyId],
        queryFn: () => apiRequest<{ memberships: Membership[] }>(`/api/v1/organization/companies/${companyId}/memberships`)
            .then(res => res.data?.memberships || []),
        enabled: !!companyId,
    })
}
