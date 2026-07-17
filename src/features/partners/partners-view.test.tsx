import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { beforeEach, describe, expect, it, vi } from "vitest"
import messages from "../../../messages/en.json"
import { PartnersView } from "@/features/partners/partners-view"
import {
    useCreatePartner,
    useCreatePartnerAddress,
    useCreatePartnerContact,
    useDeletePartner,
    useDeletePartnerAddress,
    useDeletePartnerContact,
    usePartner,
    usePartners,
    useUpdatePartner,
} from "@/features/partners/partners-api"

vi.mock("@/features/partners/partners-api", () => ({
    usePartners: vi.fn(),
    usePartner: vi.fn(),
    useCreatePartner: vi.fn(),
    useUpdatePartner: vi.fn(),
    useDeletePartner: vi.fn(),
    useCreatePartnerContact: vi.fn(),
    useDeletePartnerContact: vi.fn(),
    useCreatePartnerAddress: vi.fn(),
    useDeletePartnerAddress: vi.fn(),
}))

function renderView() {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <PartnersView />
        </NextIntlClientProvider>,
    )
}

const createPartner = vi.fn()
const updatePartner = vi.fn()
const deletePartner = vi.fn()
const createContact = vi.fn()
const deleteContact = vi.fn()
const createAddress = vi.fn()
const deleteAddress = vi.fn()

describe("PartnersView", () => {
    beforeEach(() => {
        createPartner.mockReset()
        updatePartner.mockReset()
        deletePartner.mockReset()
        createContact.mockReset()
        deleteContact.mockReset()
        createAddress.mockReset()
        deleteAddress.mockReset()
        vi.mocked(usePartners).mockReturnValue({
            data: [
                {
                    id: 5,
                    company_id: 1,
                    type: "customer",
                    name: "Acme Customer",
                    code: "CUST-001",
                    email: "buyer@example.com",
                    phone: "08123456789",
                    tax_identifier: null,
                    national_id: null,
                    credit_limit: null,
                    transaction_limit: null,
                    status: "active",
                    notes: null,
                    contacts: [],
                    addresses: [],
                },
            ],
            isLoading: false,
        } as unknown as ReturnType<typeof usePartners>)
        vi.mocked(usePartner).mockReturnValue({
            data: {
                id: 5,
                company_id: 1,
                type: "customer",
                name: "Acme Customer",
                code: "CUST-001",
                email: "buyer@example.com",
                phone: "08123456789",
                tax_identifier: null,
                national_id: null,
                credit_limit: null,
                transaction_limit: null,
                status: "active",
                notes: null,
                contacts: [
                    {
                        id: 8,
                        partner_id: 5,
                        name: "Buyer Contact",
                        role: "Purchasing",
                        email: "contact@example.com",
                        phone: null,
                        is_primary: true,
                    },
                ],
                addresses: [
                    {
                        id: 9,
                        partner_id: 5,
                        type: "billing",
                        label: "HQ",
                        address_line_1: "Jl. Merdeka 1",
                        address_line_2: null,
                        city: "Jakarta",
                        province: null,
                        postal_code: null,
                        country: "ID",
                        is_default: true,
                    },
                ],
            },
            isLoading: false,
        } as ReturnType<typeof usePartner>)
        vi.mocked(useCreatePartner).mockReturnValue({
            mutateAsync: createPartner,
            isPending: false,
        } as unknown as ReturnType<typeof useCreatePartner>)
        vi.mocked(useUpdatePartner).mockReturnValue({
            mutateAsync: updatePartner,
            isPending: false,
        } as unknown as ReturnType<typeof useUpdatePartner>)
        vi.mocked(useDeletePartner).mockReturnValue({
            mutateAsync: deletePartner,
            isPending: false,
        } as unknown as ReturnType<typeof useDeletePartner>)
        vi.mocked(useCreatePartnerContact).mockReturnValue({
            mutateAsync: createContact,
            isPending: false,
        } as unknown as ReturnType<typeof useCreatePartnerContact>)
        vi.mocked(useDeletePartnerContact).mockReturnValue({
            mutateAsync: deleteContact,
            isPending: false,
        } as unknown as ReturnType<typeof useDeletePartnerContact>)
        vi.mocked(useCreatePartnerAddress).mockReturnValue({
            mutateAsync: createAddress,
            isPending: false,
        } as unknown as ReturnType<typeof useCreatePartnerAddress>)
        vi.mocked(useDeletePartnerAddress).mockReturnValue({
            mutateAsync: deleteAddress,
            isPending: false,
        } as unknown as ReturnType<typeof useDeletePartnerAddress>)
    })

    it("lists partners and creates a new partner from the workspace", () => {
        renderView()

        expect(screen.getByRole("heading", { name: "Partners" })).toBeInTheDocument()
        expect(screen.getByText("Acme Customer")).toBeInTheDocument()

        fireEvent.change(screen.getByLabelText("Partner name"), {
            target: { value: "Fresh Supplier" },
        })
        fireEvent.change(screen.getByLabelText("Type"), {
            target: { value: "supplier" },
        })
        fireEvent.click(screen.getByRole("button", { name: "Create partner" }))

        expect(createPartner).toHaveBeenCalledWith({
            name: "Fresh Supplier",
            type: "supplier",
            code: null,
            email: null,
            phone: null,
            status: "active",
            notes: null,
        })
    })

    it("edits partners and maintains contacts and addresses from the detail panel", async () => {
        renderView()

        fireEvent.click(screen.getByRole("button", { name: "Acme Customer" }))

        fireEvent.change(screen.getByLabelText("Edit partner name"), {
            target: { value: "Acme Updated" },
        })
        fireEvent.click(screen.getByRole("button", { name: "Save changes" }))

        expect(updatePartner).toHaveBeenCalledWith({
            partnerId: 5,
            input: expect.objectContaining({ name: "Acme Updated" }),
        })

        fireEvent.change(screen.getByLabelText("Contact name"), {
            target: { value: "New Buyer" },
        })
        fireEvent.click(screen.getByRole("button", { name: "Add contact" }))
        expect(createContact).toHaveBeenCalledWith({
            partnerId: 5,
            input: expect.objectContaining({ name: "New Buyer" }),
        })

        fireEvent.change(screen.getByLabelText("Address line"), {
            target: { value: "Jl. Sudirman 10" },
        })
        fireEvent.click(screen.getByRole("button", { name: "Add address" }))
        expect(createAddress).toHaveBeenCalledWith({
            partnerId: 5,
            input: expect.objectContaining({ address_line_1: "Jl. Sudirman 10" }),
        })

        fireEvent.click(screen.getByRole("button", { name: "Delete contact Buyer Contact" }))
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }))
        await waitFor(() => expect(deleteContact).toHaveBeenCalledWith({ partnerId: 5, contactId: 8 }))

        fireEvent.click(screen.getByRole("button", { name: "Delete address HQ" }))
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }))
        await waitFor(() => expect(deleteAddress).toHaveBeenCalledWith({ partnerId: 5, addressId: 9 }))

        fireEvent.click(screen.getByRole("button", { name: "Delete partner" }))
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }))
        await waitFor(() => expect(deletePartner).toHaveBeenCalledWith(5))
    })
})
