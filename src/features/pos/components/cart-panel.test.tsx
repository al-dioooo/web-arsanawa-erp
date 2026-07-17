import { render, screen } from "@testing-library/react"
import { vi } from "vitest"
import { CartPanel } from "@/features/pos/components/cart-panel"

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}))

function renderCart(cateringOnly = false) {
    render(
        <CartPanel
            items={[]}
            saleType="catering"
            onSaleTypeChange={vi.fn()}
            customers={[]}
            catering={{
                partnerId: "",
                fulfilmentDate: "",
                deliveryAddress: "",
                customerName: "",
            }}
            onCateringChange={vi.fn()}
            onIncrement={vi.fn()}
            onDecrement={vi.fn()}
            onRemove={vi.fn()}
            draftSale={null}
            locked={false}
            isLoading={false}
            canSell
            onPrimaryAction={vi.fn()}
            onOpenPayment={vi.fn()}
            onCancel={vi.fn()}
            cateringOnly={cateringOnly}
        />,
    )
}

describe("CartPanel catering mode", () => {
    it("hides the counter sale toggle in catering-only mode", () => {
        renderCart(true)

        expect(screen.queryByRole("button", { name: /counter/ })).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: /catering/ })).not.toBeInTheDocument()
        expect(screen.getByLabelText("fulfilmentDate")).toBeInTheDocument()
    })

    it("keeps the sale type toggle outside catering-only mode", () => {
        renderCart(false)

        expect(screen.getByRole("button", { name: /counter/ })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /catering/ })).toBeInTheDocument()
    })
})
