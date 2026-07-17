import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { StaggerGroup, StaggerItem, staggerInterval } from "@/components/ui/stagger"

describe("StaggerGroup / StaggerItem", () => {
    it("renders children inside the animated container", () => {
        render(
            <StaggerGroup data-testid="group">
                <StaggerItem>Revenue</StaggerItem>
                <StaggerItem>Expenses</StaggerItem>
            </StaggerGroup>,
        )

        const group = screen.getByTestId("group")

        expect(group.tagName).toBe("DIV")
        expect(screen.getByText("Revenue")).toBeInTheDocument()
        expect(screen.getByText("Expenses")).toBeInTheDocument()
    })

    it("supports list semantics via the as prop", () => {
        render(
            <StaggerGroup as="ul" aria-label="KPIs">
                <StaggerItem as="li">Sales</StaggerItem>
            </StaggerGroup>,
        )

        const list = screen.getByRole("list", { name: "KPIs" })

        expect(list.tagName).toBe("UL")
        expect(screen.getByRole("listitem")).toHaveTextContent("Sales")
    })

    it("passes className through", () => {
        render(
            <StaggerGroup data-testid="group" className="grid gap-4">
                <StaggerItem className="col-span-2">One</StaggerItem>
            </StaggerGroup>,
        )

        expect(screen.getByTestId("group")).toHaveClass("grid", "gap-4")
        expect(screen.getByText("One")).toHaveClass("col-span-2")
    })
})

describe("staggerInterval", () => {
    it("uses the base 50ms interval for 8 or fewer children", () => {
        expect(staggerInterval(1)).toBe(0.05)
        expect(staggerInterval(4)).toBe(0.05)
        expect(staggerInterval(8)).toBe(0.05)
    })

    it("clamps the total cascade to 350ms for larger groups", () => {
        expect(staggerInterval(10)).toBeCloseTo(0.035)
        expect(staggerInterval(14)).toBeCloseTo(0.025)
        expect(staggerInterval(35)).toBeCloseTo(0.01)

        for (const count of [9, 12, 20, 40]) {
            expect(staggerInterval(count) * count).toBeLessThanOrEqual(0.35 + 1e-9)
        }
    })
})
