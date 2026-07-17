import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StatCard } from "@/components/ui/stat-card"

const formatValue = (n: number) => `Rp ${n}`

describe("StatCard", () => {
    it("renders as a link card with a chevron when href is set", () => {
        const { container } = render(
            <StatCard label="Total Sales" href="/pos/sales" value={5000} formatValue={formatValue} />,
        )

        const link = screen.getByRole("link")
        expect(link).toHaveAttribute("href", "/pos/sales")
        expect(link).toHaveTextContent("Total Sales")
        expect(link).toHaveTextContent("Rp 5000")
        expect(container.querySelector('[data-slot="icon"], svg')).not.toBeNull()
    })

    it("renders as a static card without href", () => {
        const { container } = render(
            <StatCard label="Total Sales" value={5000} formatValue={formatValue} />,
        )

        expect(screen.queryByRole("link")).not.toBeInTheDocument()
        expect(screen.getByText("Total Sales")).toBeInTheDocument()
        expect(screen.getByText("Rp 5000")).toBeInTheDocument()
        // No chevron affordance on non-navigating tiles.
        expect(container.querySelector("svg")).toBeNull()
    })

    it("renders the loading skeleton and the error state", () => {
        const { container, rerender } = render(
            <StatCard label="Total Sales" value={0} formatValue={formatValue} isLoading />,
        )

        expect(container.querySelector('[data-slot="skeleton-card"]')).not.toBeNull()

        rerender(
            <StatCard
                label="Total Sales"
                value={0}
                formatValue={formatValue}
                isError
                errorLabel="Couldn't load data"
            />,
        )

        expect(screen.getByText("Couldn't load data")).toBeInTheDocument()
    })
})
