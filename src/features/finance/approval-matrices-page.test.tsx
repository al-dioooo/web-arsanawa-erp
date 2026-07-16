import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import ApprovalMatricesPage from "@/app/(app)/finance/approval-matrices/page"
import * as approvalsApi from "@/features/finance/api-approvals"

vi.mock("@/features/auth/session-provider", () => ({
    useSession: () => ({
        activeCompanyId: 1,
    }),
}))

vi.mock("@/features/finance/api-approvals", () => ({
    useApprovalMatrices: vi.fn(),
    useCreateApprovalMatrix: vi.fn(),
    useUpdateApprovalMatrix: vi.fn(),
    useDeleteApprovalMatrix: vi.fn(),
    useCompanyMembers: vi.fn(),
}))

describe("approval matrices page", () => {
    it("renders accessible tooltips for approval rule actions", () => {
        vi.mocked(approvalsApi.useApprovalMatrices).mockReturnValue({
            data: [
                {
                    id: 7,
                    company_id: 1,
                    document_type: "bill",
                    min_amount: "0.00",
                    max_amount: "1000000.00",
                    level: 1,
                    approver_user_id: 42,
                },
            ],
            isLoading: false,
        } as ReturnType<typeof approvalsApi.useApprovalMatrices>)
        vi.mocked(approvalsApi.useDeleteApprovalMatrix).mockReturnValue({
            mutate: vi.fn(),
        } as unknown as ReturnType<typeof approvalsApi.useDeleteApprovalMatrix>)
        vi.mocked(approvalsApi.useCompanyMembers).mockReturnValue({
            data: [
                {
                    id: 11,
                    company_id: 1,
                    user_id: 42,
                    branch_id: null,
                    role: "admin",
                    status: "active",
                    user: {
                        id: 42,
                        name: "Maya Admin",
                        email: "maya@example.test",
                        username: "maya",
                    },
                },
            ],
        } as ReturnType<typeof approvalsApi.useCompanyMembers>)

        render(<ApprovalMatricesPage />)

        expect(screen.getByText("Edit Rule")).toBeInTheDocument()
        expect(screen.getByText("Delete Rule")).toBeInTheDocument()
    })
})
