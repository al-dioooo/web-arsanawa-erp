"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Field, SelectField } from "@/components/ui/field"
import { StatusPill } from "@/components/ui/status-pill"
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
    type PartnerStatus,
    type PartnerType,
} from "@/features/partners/partners-api"

export function PartnersView() {
    const { data: partners = [], isLoading } = usePartners({ per_page: 100 })
    const createPartner = useCreatePartner()
    const updatePartner = useUpdatePartner()
    const deletePartner = useDeletePartner()
    const createContact = useCreatePartnerContact()
    const deleteContact = useDeletePartnerContact()
    const createAddress = useCreatePartnerAddress()
    const deleteAddress = useDeletePartnerAddress()
    const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null)
    const { data: selectedPartner, isLoading: selectedLoading } = usePartner(selectedPartnerId)
    const [form, setForm] = useState({
        name: "",
        type: "customer" as PartnerType,
        code: "",
        email: "",
        phone: "",
        notes: "",
    })
    const [editForm, setEditForm] = useState({
        name: "",
        type: "customer" as PartnerType,
        status: "active" as PartnerStatus,
        code: "",
        email: "",
        phone: "",
        tax_identifier: "",
        national_id: "",
        credit_limit: "",
        transaction_limit: "",
        notes: "",
    })
    const [contactForm, setContactForm] = useState({
        name: "",
        role: "",
        email: "",
        phone: "",
        is_primary: false,
    })
    const [addressForm, setAddressForm] = useState({
        type: "billing" as "billing" | "shipping" | "other",
        label: "",
        address_line_1: "",
        address_line_2: "",
        city: "",
        province: "",
        postal_code: "",
        country: "ID",
        is_default: false,
    })

    useEffect(() => {
        if (selectedPartnerId || partners.length === 0) return

        let active = true
        void Promise.resolve().then(() => {
            if (active) setSelectedPartnerId(partners[0].id)
        })
        return () => {
            active = false
        }
    }, [partners, selectedPartnerId])

    useEffect(() => {
        if (!selectedPartner) return

        let active = true
        void Promise.resolve().then(() => {
            if (!active) return

            setEditForm({
                name: selectedPartner.name,
                type: selectedPartner.type,
                status: selectedPartner.status,
                code: selectedPartner.code ?? "",
                email: selectedPartner.email ?? "",
                phone: selectedPartner.phone ?? "",
                tax_identifier: selectedPartner.tax_identifier ?? "",
                national_id: selectedPartner.national_id ?? "",
                credit_limit: selectedPartner.credit_limit ?? "",
                transaction_limit: selectedPartner.transaction_limit ?? "",
                notes: selectedPartner.notes ?? "",
            })
        })
        return () => {
            active = false
        }
    }, [selectedPartner])

    const selectedContacts = useMemo(() => selectedPartner?.contacts ?? [], [selectedPartner])
    const selectedAddresses = useMemo(() => selectedPartner?.addresses ?? [], [selectedPartner])

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!form.name.trim()) return

        await createPartner.mutateAsync({
            name: form.name.trim(),
            type: form.type,
            code: form.code.trim() || null,
            email: form.email.trim() || null,
            phone: form.phone.trim() || null,
            status: "active",
            notes: form.notes.trim() || null,
        })

        setForm({
            name: "",
            type: "customer",
            code: "",
            email: "",
            phone: "",
            notes: "",
        })
    }

    async function saveSelectedPartner(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!selectedPartner) return

        await updatePartner.mutateAsync({
            partnerId: selectedPartner.id,
            input: {
                name: editForm.name.trim(),
                type: editForm.type,
                status: editForm.status,
                code: editForm.code.trim() || null,
                email: editForm.email.trim() || null,
                phone: editForm.phone.trim() || null,
                tax_identifier: editForm.tax_identifier.trim() || null,
                national_id: editForm.national_id.trim() || null,
                credit_limit: editForm.credit_limit || null,
                transaction_limit: editForm.transaction_limit || null,
                notes: editForm.notes.trim() || null,
            },
        })
    }

    async function addContact(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!selectedPartner || !contactForm.name.trim()) return

        await createContact.mutateAsync({
            partnerId: selectedPartner.id,
            input: {
                name: contactForm.name.trim(),
                role: contactForm.role.trim() || null,
                email: contactForm.email.trim() || null,
                phone: contactForm.phone.trim() || null,
                is_primary: contactForm.is_primary,
            },
        })

        setContactForm({ name: "", role: "", email: "", phone: "", is_primary: false })
    }

    async function addAddress(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!selectedPartner || !addressForm.address_line_1.trim()) return

        await createAddress.mutateAsync({
            partnerId: selectedPartner.id,
            input: {
                type: addressForm.type,
                label: addressForm.label.trim() || null,
                address_line_1: addressForm.address_line_1.trim(),
                address_line_2: addressForm.address_line_2.trim() || null,
                city: addressForm.city.trim() || null,
                province: addressForm.province.trim() || null,
                postal_code: addressForm.postal_code.trim() || null,
                country: addressForm.country.trim() || null,
                is_default: addressForm.is_default,
            },
        })

        setAddressForm({
            type: "billing",
            label: "",
            address_line_1: "",
            address_line_2: "",
            city: "",
            province: "",
            postal_code: "",
            country: "ID",
            is_default: false,
        })
    }

    return (
        <div className="grid gap-6">
            <section className="rounded-2xl border border-navy-100 bg-white p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-teal-700 font-display">
                    Shared master data
                </p>
                <h1 className="mt-2 text-2xl font-brand font-bold text-navy-900">
                    Partners
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-500">
                    Maintain customers, suppliers, and shared contacts used by Finance and POS.
                </p>
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
                <div className="rounded-2xl border border-navy-100 bg-white p-6">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <h2 className="text-lg font-bold text-navy-900 font-display">
                            Directory
                        </h2>
                        <StatusPill tone="neutral">{partners.length}</StatusPill>
                    </div>

                    <div className="grid gap-2">
                        {isLoading ? (
                            <p className="rounded-xl border border-dashed border-navy-100 bg-navy-50/30 p-4 text-sm text-navy-500">
                                Loading partners...
                            </p>
                        ) : partners.length > 0 ? (
                            partners.map((partner) => (
                                <button
                                    type="button"
                                    key={partner.id}
                                    aria-label={partner.name}
                                    onClick={() => setSelectedPartnerId(partner.id)}
                                    className={`w-full rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                                        selectedPartnerId === partner.id
                                            ? "border-teal-300 bg-teal-50/50"
                                            : "border-navy-100 bg-navy-50/20 hover:bg-navy-50"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-navy-900">
                                                {partner.name}
                                            </p>
                                            <p className="mt-1 truncate text-xs font-medium text-navy-500">
                                                {partner.code ?? "No code"} · {partner.email ?? "No email"}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                            <StatusPill tone="neutral">{partner.type}</StatusPill>
                                            <StatusPill tone={partner.status === "active" ? "green" : "neutral"}>
                                                {partner.status}
                                            </StatusPill>
                                        </div>
                                    </div>
                                    {partner.phone ? (
                                        <p className="mt-3 text-xs font-medium text-navy-500">
                                            {partner.phone}
                                        </p>
                                    ) : null}
                                </button>
                            ))
                        ) : (
                            <p className="rounded-xl border border-dashed border-navy-100 bg-navy-50/30 p-4 text-sm text-navy-500">
                                No partners yet. Add a customer or supplier to unblock Finance and POS workflows.
                            </p>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-navy-100 bg-white p-6">
                    <h2 className="text-lg font-bold text-navy-900 font-display">
                        Create Partner
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-navy-500">
                        Start with the primary identity. Contacts and addresses can be expanded from this shared record.
                    </p>

                    <form onSubmit={submit} className="mt-5 grid gap-4">
                        <Field
                            label="Partner name"
                            value={form.name}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, name: event.target.value }))
                            }
                            required
                        />
                        <SelectField
                            label="Type"
                            value={form.type}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    type: event.target.value as PartnerType,
                                }))
                            }
                        >
                            <option value="customer">Customer</option>
                            <option value="supplier">Supplier</option>
                            <option value="both">Both</option>
                        </SelectField>
                        <Field
                            label="Code"
                            value={form.code}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, code: event.target.value }))
                            }
                            placeholder="CUST-001"
                        />
                        <Field
                            label="Email"
                            type="email"
                            value={form.email}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, email: event.target.value }))
                            }
                            placeholder="partner@example.com"
                        />
                        <Field
                            label="Phone"
                            value={form.phone}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, phone: event.target.value }))
                            }
                            placeholder="08123456789"
                        />
                        <Field
                            label="Notes"
                            value={form.notes}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, notes: event.target.value }))
                            }
                            placeholder="Internal context"
                        />
                        <Button type="submit" size="xl" disabled={createPartner.isPending}>
                            Create partner
                        </Button>
                    </form>
                </div>
            </section>

            <section className="rounded-2xl border border-navy-100 bg-white p-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-navy-900 font-display">
                            Partner Detail
                        </h2>
                        <p className="mt-1 text-xs leading-relaxed text-navy-500">
                            Edit the shared partner record and maintain API-backed contacts and addresses.
                        </p>
                    </div>
                    {selectedPartner ? (
                        <StatusPill tone={selectedPartner.status === "active" ? "green" : "neutral"}>
                            {selectedPartner.status}
                        </StatusPill>
                    ) : null}
                </div>

                {selectedLoading ? (
                    <p className="rounded-xl border border-dashed border-navy-100 bg-navy-50/30 p-4 text-sm text-navy-500">
                        Loading selected partner...
                    </p>
                ) : selectedPartner ? (
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                        <form className="grid gap-4" onSubmit={saveSelectedPartner}>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label="Edit partner name"
                                    value={editForm.name}
                                    onChange={(event) =>
                                        setEditForm((current) => ({ ...current, name: event.target.value }))
                                    }
                                    required
                                />
                                <SelectField
                                    label="Status"
                                    value={editForm.status}
                                    onChange={(event) =>
                                        setEditForm((current) => ({
                                            ...current,
                                            status: event.target.value as PartnerStatus,
                                        }))
                                    }
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </SelectField>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <SelectField
                                    label="Edit type"
                                    value={editForm.type}
                                    onChange={(event) =>
                                        setEditForm((current) => ({
                                            ...current,
                                            type: event.target.value as PartnerType,
                                        }))
                                    }
                                >
                                    <option value="customer">Customer</option>
                                    <option value="supplier">Supplier</option>
                                    <option value="both">Both</option>
                                </SelectField>
                                <Field
                                    label="Edit code"
                                    value={editForm.code}
                                    onChange={(event) =>
                                        setEditForm((current) => ({ ...current, code: event.target.value }))
                                    }
                                />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label="Edit email"
                                    type="email"
                                    value={editForm.email}
                                    onChange={(event) =>
                                        setEditForm((current) => ({ ...current, email: event.target.value }))
                                    }
                                />
                                <Field
                                    label="Edit phone"
                                    value={editForm.phone}
                                    onChange={(event) =>
                                        setEditForm((current) => ({ ...current, phone: event.target.value }))
                                    }
                                />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label="Tax ID"
                                    value={editForm.tax_identifier}
                                    onChange={(event) =>
                                        setEditForm((current) => ({
                                            ...current,
                                            tax_identifier: event.target.value,
                                        }))
                                    }
                                />
                                <Field
                                    label="National ID"
                                    value={editForm.national_id}
                                    onChange={(event) =>
                                        setEditForm((current) => ({
                                            ...current,
                                            national_id: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label="Credit limit"
                                    type="number"
                                    min={0}
                                    value={editForm.credit_limit}
                                    onChange={(event) =>
                                        setEditForm((current) => ({
                                            ...current,
                                            credit_limit: event.target.value,
                                        }))
                                    }
                                />
                                <Field
                                    label="Transaction limit"
                                    type="number"
                                    min={0}
                                    value={editForm.transaction_limit}
                                    onChange={(event) =>
                                        setEditForm((current) => ({
                                            ...current,
                                            transaction_limit: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <Field
                                label="Edit notes"
                                value={editForm.notes}
                                onChange={(event) =>
                                    setEditForm((current) => ({ ...current, notes: event.target.value }))
                                }
                            />
                            <div className="flex flex-wrap gap-2">
                                <Button type="submit" size="xl" disabled={updatePartner.isPending}>
                                    Save changes
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="xl"
                                    disabled={deletePartner.isPending}
                                    onClick={() => void deletePartner.mutateAsync(selectedPartner.id)}
                                >
                                    Delete partner
                                </Button>
                            </div>
                        </form>

                        <div className="grid gap-6">
                            <div className="rounded-xl border border-navy-100 bg-navy-50/20 p-4">
                                <h3 className="text-sm font-bold text-navy-900 font-display">
                                    Contacts
                                </h3>
                                <div className="mt-3 grid gap-2">
                                    {selectedContacts.map((contact) => (
                                        <div
                                            key={contact.id}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-navy-100 bg-white px-3 py-2"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-navy-900">
                                                    {contact.name}
                                                </p>
                                                <p className="truncate text-xs text-navy-500">
                                                    {contact.role ?? "No role"} · {contact.email ?? "No email"}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                aria-label={`Delete contact ${contact.name}`}
                                                onClick={() =>
                                                    void deleteContact.mutateAsync({
                                                        partnerId: selectedPartner.id,
                                                        contactId: contact.id,
                                                    })
                                                }
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={addContact} className="mt-4 grid gap-3">
                                    <Field
                                        label="Contact name"
                                        value={contactForm.name}
                                        onChange={(event) =>
                                            setContactForm((current) => ({
                                                ...current,
                                                name: event.target.value,
                                            }))
                                        }
                                    />
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Field
                                            label="Contact role"
                                            value={contactForm.role}
                                            onChange={(event) =>
                                                setContactForm((current) => ({
                                                    ...current,
                                                    role: event.target.value,
                                                }))
                                            }
                                        />
                                        <Field
                                            label="Contact email"
                                            type="email"
                                            value={contactForm.email}
                                            onChange={(event) =>
                                                setContactForm((current) => ({
                                                    ...current,
                                                    email: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <Field
                                        label="Contact phone"
                                        value={contactForm.phone}
                                        onChange={(event) =>
                                            setContactForm((current) => ({
                                                ...current,
                                                phone: event.target.value,
                                            }))
                                        }
                                    />
                                    <label className="flex items-center gap-2 text-sm font-semibold text-navy-700">
                                        <input
                                            type="checkbox"
                                            checked={contactForm.is_primary}
                                            onChange={(event) =>
                                                setContactForm((current) => ({
                                                    ...current,
                                                    is_primary: event.target.checked,
                                                }))
                                            }
                                        />
                                        Primary contact
                                    </label>
                                    <Button type="submit" variant="secondary" disabled={createContact.isPending}>
                                        Add contact
                                    </Button>
                                </form>
                            </div>

                            <div className="rounded-xl border border-navy-100 bg-navy-50/20 p-4">
                                <h3 className="text-sm font-bold text-navy-900 font-display">
                                    Addresses
                                </h3>
                                <div className="mt-3 grid gap-2">
                                    {selectedAddresses.map((address) => (
                                        <div
                                            key={address.id}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-navy-100 bg-white px-3 py-2"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-navy-900">
                                                    {address.label ?? address.type}
                                                </p>
                                                <p className="truncate text-xs text-navy-500">
                                                    {address.address_line_1}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                aria-label={`Delete address ${address.label ?? address.type}`}
                                                onClick={() =>
                                                    void deleteAddress.mutateAsync({
                                                        partnerId: selectedPartner.id,
                                                        addressId: address.id,
                                                    })
                                                }
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={addAddress} className="mt-4 grid gap-3">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <SelectField
                                            label="Address type"
                                            value={addressForm.type}
                                            onChange={(event) =>
                                                setAddressForm((current) => ({
                                                    ...current,
                                                    type: event.target.value as "billing" | "shipping" | "other",
                                                }))
                                            }
                                        >
                                            <option value="billing">Billing</option>
                                            <option value="shipping">Shipping</option>
                                            <option value="other">Other</option>
                                        </SelectField>
                                        <Field
                                            label="Address label"
                                            value={addressForm.label}
                                            onChange={(event) =>
                                                setAddressForm((current) => ({
                                                    ...current,
                                                    label: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <Field
                                        label="Address line"
                                        value={addressForm.address_line_1}
                                        onChange={(event) =>
                                            setAddressForm((current) => ({
                                                ...current,
                                                address_line_1: event.target.value,
                                            }))
                                        }
                                    />
                                    <Field
                                        label="Address line 2"
                                        value={addressForm.address_line_2}
                                        onChange={(event) =>
                                            setAddressForm((current) => ({
                                                ...current,
                                                address_line_2: event.target.value,
                                            }))
                                        }
                                    />
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Field
                                            label="City"
                                            value={addressForm.city}
                                            onChange={(event) =>
                                                setAddressForm((current) => ({
                                                    ...current,
                                                    city: event.target.value,
                                                }))
                                            }
                                        />
                                        <Field
                                            label="Province"
                                            value={addressForm.province}
                                            onChange={(event) =>
                                                setAddressForm((current) => ({
                                                    ...current,
                                                    province: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Field
                                            label="Postal code"
                                            value={addressForm.postal_code}
                                            onChange={(event) =>
                                                setAddressForm((current) => ({
                                                    ...current,
                                                    postal_code: event.target.value,
                                                }))
                                            }
                                        />
                                        <Field
                                            label="Country"
                                            value={addressForm.country}
                                            onChange={(event) =>
                                                setAddressForm((current) => ({
                                                    ...current,
                                                    country: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-navy-700">
                                        <input
                                            type="checkbox"
                                            checked={addressForm.is_default}
                                            onChange={(event) =>
                                                setAddressForm((current) => ({
                                                    ...current,
                                                    is_default: event.target.checked,
                                                }))
                                            }
                                        />
                                        Default address
                                    </label>
                                    <Button type="submit" variant="secondary" disabled={createAddress.isPending}>
                                        Add address
                                    </Button>
                                </form>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="rounded-xl border border-dashed border-navy-100 bg-navy-50/30 p-4 text-sm text-navy-500">
                        Select a partner to view details.
                    </p>
                )}
            </section>
        </div>
    )
}
