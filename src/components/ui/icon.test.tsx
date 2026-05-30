import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Icon } from "@/components/ui/icon"
import { isNavGroup, moduleRegistry } from "@/lib/modules/registry"

const inventoryMenuIconNames = moduleRegistry
    .find((module) => module.key === "inventory")
    ?.nav.flatMap((item) => (isNavGroup(item) ? item.items : [item]))
    .map((item) => item.icon) ?? []

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

    it("renders every Inventory module menu alias as a Tabler icon", () => {
        expect(inventoryMenuIconNames).not.toHaveLength(0)

        for (const iconName of inventoryMenuIconNames) {
            const { container, unmount } = render(<Icon name={iconName} />)
            const svg = container.querySelector("svg")

            expect(svg, iconName).toBeInTheDocument()
            expect(svg, iconName).not.toHaveClass("lucide-circle-question-mark")
            expect(svg?.getAttribute("class") ?? "", iconName).not.toContain("lucide-")

            unmount()
        }
    })
})
