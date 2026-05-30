import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Icon } from "@/components/ui/icon"

describe("Icon", () => {
    it("renders semantic POS aliases from the central icon map", () => {
        const { container } = render(<Icon name="point_of_sale" />)

        expect(container.querySelector("svg")).toHaveClass("lucide-badge-dollar-sign")
    })

    it("renders account menu settings aliases instead of fallback icons", () => {
        const profile = render(<Icon name="manage_accounts" />)
        const platform = render(<Icon name="tune" />)

        expect(profile.container.querySelector("svg")).toHaveClass("lucide-user-cog")
        expect(platform.container.querySelector("svg")).toHaveClass("lucide-sliders-horizontal")
    })

    it("falls back safely for unknown aliases", () => {
        const { container } = render(<Icon name="unknown-icon-alias" />)

        expect(container.querySelector("svg")).toHaveClass("lucide-circle-question-mark")
    })
})
