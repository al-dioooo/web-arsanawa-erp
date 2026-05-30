import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Field, SelectField } from "@/components/ui/field"

describe("Field", () => {
    it("renders a native input when no custom control is provided", () => {
        render(<Field label="Bill Date" type="date" name="bill_date" />)

        expect(screen.getByLabelText("Bill Date")).toHaveAttribute("type", "date")
    })

    it("renders custom form controls without passing children to the input element", () => {
        expect(() => {
            render(
                <Field label="Vendor">
                    <div data-testid="vendor-select">Searchable vendor select</div>
                </Field>,
            )
        }).not.toThrow()

        expect(screen.getByText("Vendor")).toBeInTheDocument()
        expect(screen.getByTestId("vendor-select")).toHaveTextContent("Searchable vendor select")
    })
})

describe("SelectField", () => {
    it("keeps select options accessible through the label", () => {
        render(
            <SelectField label="Tax Type" defaultValue="ppn">
                <option value="ppn">PPN</option>
                <option value="pph">PPh</option>
            </SelectField>,
        )

        expect(screen.getByLabelText("Tax Type")).toHaveValue("ppn")
    })
})
