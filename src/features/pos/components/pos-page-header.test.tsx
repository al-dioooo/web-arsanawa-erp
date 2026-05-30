import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PosPageHeader } from "@/features/pos/components/pos-page-header"

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => {
        const labels: Record<string, string> = {
            "common.companyScoped": "Company scoped",
            "common.noCompany": "No company",
            "common.ready": "Ready",
            "common.syncing": "Syncing",
        }

        return labels[key] ?? key
    },
}))

describe("PosPageHeader", () => {
    it("keeps company scoping but removes API loading pills and inline response banners", () => {
        render(
            <PosPageHeader
                title="Registers"
                subtitle="Manage register access."
                hasCompany
                isLoading
                message="Register opened."
                error="Register failed."
            />,
        )

        expect(screen.getByText("Company scoped")).toBeInTheDocument()
        expect(screen.queryByText("Syncing")).not.toBeInTheDocument()
        expect(screen.queryByText("Ready")).not.toBeInTheDocument()
        expect(screen.queryByText("Register opened.")).not.toBeInTheDocument()
        expect(screen.queryByText("Register failed.")).not.toBeInTheDocument()
    })
})
