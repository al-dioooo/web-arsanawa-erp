import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Field, SelectField } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputDate } from "@/components/ui/input-date"
import { SelectDescription } from "@/components/ui/select-description"
import { SearchableSelect } from "@/components/ui/searchable-select"

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

describe("Shared form components", () => {
    it("renders text and numeric inputs with a shared label/error contract", () => {
        render(
            <Input
                label="Amount"
                type="number"
                value="10000"
                onChange={() => {}}
                error="Amount is required"
            />,
        )

        expect(screen.getByLabelText("Amount")).toHaveAttribute("type", "number")
        expect(screen.getByLabelText("Amount")).toHaveValue(10000)
        expect(screen.getByText("Amount is required")).toBeInTheDocument()
    })

    it("can keep labels accessible without rendering visible table-cell labels", () => {
        render(<Input label="Line debit" hideLabel value="100" onChange={() => {}} />)

        expect(screen.getByLabelText("Line debit")).toHaveValue("100")
        expect(screen.getByText("Line debit")).toHaveClass("sr-only")
    })

    it("renders date inputs with the same field contract", () => {
        render(<InputDate label="Posting date" value="2026-05-31" onChange={() => {}} />)

        expect(screen.getByLabelText("Posting date")).toHaveValue("2026-05-31")
    })

    it("renders hard-coded select options with descriptions", () => {
        render(
            <SelectDescription
                label="Locale"
                value="id"
                onChange={() => {}}
                options={[
                    { value: "id", label: "Indonesia", description: "Use Indonesian labels and formats." },
                    { value: "en", label: "English", description: "Use English labels and formats." },
                ]}
            />,
        )

        expect(screen.getByLabelText("Locale")).toHaveValue("id")
        expect(screen.getByText("Use Indonesian labels and formats.")).toBeInTheDocument()
    })

    it("keeps searchable select options accessible with shared styling", () => {
        render(
            <SearchableSelect
                label="Product"
                value="sku-1"
                onChange={() => {}}
                options={[{ value: "sku-1", label: "Nasi Box" }]}
            />,
        )

        expect(screen.getByLabelText("Product")).toHaveValue("Nasi Box")
    })
})
