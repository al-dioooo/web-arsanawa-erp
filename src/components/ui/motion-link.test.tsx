import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MotionLinkItem } from "@/components/ui/motion-link"

describe("MotionLinkItem", () => {
    it("renders an accessible route link with motion metadata", () => {
        render(
            <MotionLinkItem href="/inventory/stock/lots" label="Stock Lots" icon="local_offer">
                Batch balances and expiry tracking
            </MotionLinkItem>,
        )

        const link = screen.getByRole("link", { name: /Stock Lots/i })

        expect(link).toHaveAttribute("href", "/inventory/stock/lots")
        expect(link).toHaveAttribute("data-motion-control", "link-item")
        expect(screen.getByText("Batch balances and expiry tracking")).toBeInTheDocument()
    })
})
