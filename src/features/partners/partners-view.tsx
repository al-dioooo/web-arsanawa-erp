"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { Field, SelectField } from "@/components/ui/field"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusPill } from "@/components/ui/status-pill"
import { cn } from "@/lib/utils"
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
    const t = useTranslations("partners")
    const commonT = useTranslations("common")
    const [confirm, confirmDialog] = useConfirm()
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
            {confirmDialog}
            <PageHeader
                eyebrow={t("eyebrow")}
                title={t("title")}
                subtitle={t("subtitle")}
                className="mb-0"
            />

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
                <Card as="div" padding="lg">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <h2 className="type-section">{t("directory.title")}</h2>
                        <StatusPill tone="neutral">{partners.length}</StatusPill>
                    </div>

                    <div className="grid gap-2">
                        {isLoading ? (
                            <div className="grid gap-2" aria-hidden="true">
                                {Array.from({ length: 4 }).map((_, row) => (
                                    <Skeleton key={row} className="h-16 rounded-md" />
                                ))}
                            </div>
                        ) : partners.length > 0 ? (
                            partners.map((partner) => (
                                <button
                                    type="button"
                                    key={partner.id}
                                    aria-label={partner.name}
                                    onClick={() => setSelectedPartnerId(partner.id)}
                                    className={cn(
                                        "w-full cursor-pointer rounded-md p-4 text-left transition-colors",
                                        selectedPartnerId === partner.id
                                            ? "bg-brand-soft"
                                            : "bg-surface-muted/60 hover:bg-surface-muted",
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-ink">
                                                {partner.name}
                                            </p>
                                            <p className="mt-1 truncate text-xs font-medium text-ink-muted">
                                                {partner.code ?? t("directory.noCode")} ·{" "}
                                                {partner.email ?? t("directory.noEmail")}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                            <StatusPill tone="neutral">
                                                {t(`types.${partner.type}`)}
                                            </StatusPill>
                                            <StatusPill tone={partner.status === "active" ? "green" : "neutral"}>
                                                {t(`statuses.${partner.status}`)}
                                            </StatusPill>
                                        </div>
                                    </div>
                                    {partner.phone ? (
                                        <p className="mt-3 text-xs font-medium text-ink-muted">
                                            {partner.phone}
                                        </p>
                                    ) : null}
                                </button>
                            ))
                        ) : (
                            <EmptyState
                                compact
                                icon="groups"
                                title={t("directory.emptyTitle")}
                                description={t("directory.emptyDescription")}
                            />
                        )}
                    </div>
                </Card>

                <Card as="div" padding="lg">
                    <h2 className="type-section">{t("create.title")}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                        {t("create.description")}
                    </p>

                    <form onSubmit={submit} className="mt-5 grid gap-4">
                        <Field
                            label={t("fields.name")}
                            value={form.name}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, name: event.target.value }))
                            }
                            required
                        />
                        <SelectField
                            label={t("fields.type")}
                            value={form.type}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    type: event.target.value as PartnerType,
                                }))
                            }
                        >
                            <option value="customer">{t("types.customer")}</option>
                            <option value="supplier">{t("types.supplier")}</option>
                            <option value="both">{t("types.both")}</option>
                        </SelectField>
                        <Field
                            label={t("fields.code")}
                            value={form.code}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, code: event.target.value }))
                            }
                            placeholder="CUST-001"
                        />
                        <Field
                            label={t("fields.email")}
                            type="email"
                            value={form.email}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, email: event.target.value }))
                            }
                            placeholder="partner@example.com"
                        />
                        <Field
                            label={t("fields.phone")}
                            value={form.phone}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, phone: event.target.value }))
                            }
                            placeholder="08123456789"
                        />
                        <Field
                            label={t("fields.notes")}
                            value={form.notes}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, notes: event.target.value }))
                            }
                            placeholder={t("fields.notesPlaceholder")}
                        />
                        <Button type="submit" size="xl" disabled={createPartner.isPending}>
                            {t("create.submit")}
                        </Button>
                    </form>
                </Card>
            </section>

            <Card as="section" padding="lg">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="type-section">{t("detail.title")}</h2>
                        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                            {t("detail.description")}
                        </p>
                    </div>
                    {selectedPartner ? (
                        <StatusPill tone={selectedPartner.status === "active" ? "green" : "neutral"}>
                            {t(`statuses.${selectedPartner.status}`)}
                        </StatusPill>
                    ) : null}
                </div>

                {selectedLoading ? (
                    <div className="grid gap-2" aria-hidden="true">
                        <Skeleton className="h-11 rounded-md" />
                        <Skeleton className="h-11 w-3/4 rounded-md" />
                        <Skeleton className="h-11 w-1/2 rounded-md" />
                    </div>
                ) : selectedPartner ? (
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                        <form className="grid gap-4" onSubmit={saveSelectedPartner}>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label={t("detail.editName")}
                                    value={editForm.name}
                                    onChange={(event) =>
                                        setEditForm((current) => ({ ...current, name: event.target.value }))
                                    }
                                    required
                                />
                                <SelectField
                                    label={t("fields.status")}
                                    value={editForm.status}
                                    onChange={(event) =>
                                        setEditForm((current) => ({
                                            ...current,
                                            status: event.target.value as PartnerStatus,
                                        }))
                                    }
                                >
                                    <option value="active">{t("statuses.active")}</option>
                                    <option value="inactive">{t("statuses.inactive")}</option>
                                </SelectField>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <SelectField
                                    label={t("detail.editType")}
                                    value={editForm.type}
                                    onChange={(event) =>
                                        setEditForm((current) => ({
                                            ...current,
                                            type: event.target.value as PartnerType,
                                        }))
                                    }
                                >
                                    <option value="customer">{t("types.customer")}</option>
                                    <option value="supplier">{t("types.supplier")}</option>
                                    <option value="both">{t("types.both")}</option>
                                </SelectField>
                                <Field
                                    label={t("detail.editCode")}
                                    value={editForm.code}
                                    onChange={(event) =>
                                        setEditForm((current) => ({ ...current, code: event.target.value }))
                                    }
                                />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label={t("detail.editEmail")}
                                    type="email"
                                    value={editForm.email}
                                    onChange={(event) =>
                                        setEditForm((current) => ({ ...current, email: event.target.value }))
                                    }
                                />
                                <Field
                                    label={t("detail.editPhone")}
                                    value={editForm.phone}
                                    onChange={(event) =>
                                        setEditForm((current) => ({ ...current, phone: event.target.value }))
                                    }
                                />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label={t("fields.taxId")}
                                    value={editForm.tax_identifier}
                                    onChange={(event) =>
                                        setEditForm((current) => ({
                                            ...current,
                                            tax_identifier: event.target.value,
                                        }))
                                    }
                                />
                                <Field
                                    label={t("fields.nationalId")}
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
                                    label={t("fields.creditLimit")}
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
                                    label={t("fields.transactionLimit")}
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
                                label={t("detail.editNotes")}
                                value={editForm.notes}
                                onChange={(event) =>
                                    setEditForm((current) => ({ ...current, notes: event.target.value }))
                                }
                            />
                            <div className="flex flex-wrap gap-2">
                                <Button type="submit" size="xl" disabled={updatePartner.isPending}>
                                    {t("detail.save")}
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="xl"
                                    disabled={deletePartner.isPending}
                                    onClick={async () => {
                                        const ok = await confirm({
                                            title: t("detail.deleteConfirmTitle", {
                                                name: selectedPartner.name,
                                            }),
                                            message: t("detail.deleteConfirmMessage"),
                                            confirmLabel: commonT("delete"),
                                            cancelLabel: commonT("cancel"),
                                            danger: true,
                                        })
                                        if (ok) void deletePartner.mutateAsync(selectedPartner.id)
                                    }}
                                >
                                    {t("detail.delete")}
                                </Button>
                            </div>
                        </form>

                        <div className="grid gap-6">
                            <Card inset padding="sm">
                                <h3 className="type-section text-sm">{t("contacts.title")}</h3>
                                <div className="mt-3 grid gap-2">
                                    {selectedContacts.map((contact) => (
                                        <div
                                            key={contact.id}
                                            className="flex items-center justify-between gap-3 rounded-md bg-surface px-3 py-2 shadow-card"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-ink">
                                                    {contact.name}
                                                </p>
                                                <p className="truncate text-xs text-ink-muted">
                                                    {contact.role ?? t("contacts.noRole")} ·{" "}
                                                    {contact.email ?? t("contacts.noEmail")}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                aria-label={t("contacts.deleteAria", { name: contact.name })}
                                                onClick={async () => {
                                                    const ok = await confirm({
                                                        title: t("contacts.deleteConfirmTitle", {
                                                            name: contact.name,
                                                        }),
                                                        message: t("contacts.deleteConfirmMessage"),
                                                        confirmLabel: commonT("delete"),
                                                        cancelLabel: commonT("cancel"),
                                                        danger: true,
                                                    })
                                                    if (ok) {
                                                        void deleteContact.mutateAsync({
                                                            partnerId: selectedPartner.id,
                                                            contactId: contact.id,
                                                        })
                                                    }
                                                }}
                                            >
                                                {commonT("delete")}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={addContact} className="mt-4 grid gap-3">
                                    <Field
                                        label={t("contacts.name")}
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
                                            label={t("contacts.role")}
                                            value={contactForm.role}
                                            onChange={(event) =>
                                                setContactForm((current) => ({
                                                    ...current,
                                                    role: event.target.value,
                                                }))
                                            }
                                        />
                                        <Field
                                            label={t("contacts.email")}
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
                                        label={t("contacts.phone")}
                                        value={contactForm.phone}
                                        onChange={(event) =>
                                            setContactForm((current) => ({
                                                ...current,
                                                phone: event.target.value,
                                            }))
                                        }
                                    />
                                    <label className="flex items-center gap-2 text-sm font-semibold text-ink-secondary">
                                        <input
                                            type="checkbox"
                                            className="accent-brand"
                                            checked={contactForm.is_primary}
                                            onChange={(event) =>
                                                setContactForm((current) => ({
                                                    ...current,
                                                    is_primary: event.target.checked,
                                                }))
                                            }
                                        />
                                        {t("contacts.primary")}
                                    </label>
                                    <Button type="submit" variant="secondary" disabled={createContact.isPending}>
                                        {t("contacts.add")}
                                    </Button>
                                </form>
                            </Card>

                            <Card inset padding="sm">
                                <h3 className="type-section text-sm">{t("addresses.title")}</h3>
                                <div className="mt-3 grid gap-2">
                                    {selectedAddresses.map((address) => (
                                        <div
                                            key={address.id}
                                            className="flex items-center justify-between gap-3 rounded-md bg-surface px-3 py-2 shadow-card"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-ink">
                                                    {address.label ?? t(`addresses.types.${address.type}`)}
                                                </p>
                                                <p className="truncate text-xs text-ink-muted">
                                                    {address.address_line_1}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                aria-label={t("addresses.deleteAria", {
                                                    label: address.label ?? address.type,
                                                })}
                                                onClick={async () => {
                                                    const ok = await confirm({
                                                        title: t("addresses.deleteConfirmTitle", {
                                                            label:
                                                                address.label ??
                                                                t(`addresses.types.${address.type}`),
                                                        }),
                                                        message: t("addresses.deleteConfirmMessage"),
                                                        confirmLabel: commonT("delete"),
                                                        cancelLabel: commonT("cancel"),
                                                        danger: true,
                                                    })
                                                    if (ok) {
                                                        void deleteAddress.mutateAsync({
                                                            partnerId: selectedPartner.id,
                                                            addressId: address.id,
                                                        })
                                                    }
                                                }}
                                            >
                                                {commonT("delete")}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={addAddress} className="mt-4 grid gap-3">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <SelectField
                                            label={t("addresses.type")}
                                            value={addressForm.type}
                                            onChange={(event) =>
                                                setAddressForm((current) => ({
                                                    ...current,
                                                    type: event.target.value as "billing" | "shipping" | "other",
                                                }))
                                            }
                                        >
                                            <option value="billing">{t("addresses.types.billing")}</option>
                                            <option value="shipping">{t("addresses.types.shipping")}</option>
                                            <option value="other">{t("addresses.types.other")}</option>
                                        </SelectField>
                                        <Field
                                            label={t("addresses.label")}
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
                                        label={t("addresses.line1")}
                                        value={addressForm.address_line_1}
                                        onChange={(event) =>
                                            setAddressForm((current) => ({
                                                ...current,
                                                address_line_1: event.target.value,
                                            }))
                                        }
                                    />
                                    <Field
                                        label={t("addresses.line2")}
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
                                            label={t("addresses.city")}
                                            value={addressForm.city}
                                            onChange={(event) =>
                                                setAddressForm((current) => ({
                                                    ...current,
                                                    city: event.target.value,
                                                }))
                                            }
                                        />
                                        <Field
                                            label={t("addresses.province")}
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
                                            label={t("addresses.postalCode")}
                                            value={addressForm.postal_code}
                                            onChange={(event) =>
                                                setAddressForm((current) => ({
                                                    ...current,
                                                    postal_code: event.target.value,
                                                }))
                                            }
                                        />
                                        <Field
                                            label={t("addresses.country")}
                                            value={addressForm.country}
                                            onChange={(event) =>
                                                setAddressForm((current) => ({
                                                    ...current,
                                                    country: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-ink-secondary">
                                        <input
                                            type="checkbox"
                                            className="accent-brand"
                                            checked={addressForm.is_default}
                                            onChange={(event) =>
                                                setAddressForm((current) => ({
                                                    ...current,
                                                    is_default: event.target.checked,
                                                }))
                                            }
                                        />
                                        {t("addresses.default")}
                                    </label>
                                    <Button type="submit" variant="secondary" disabled={createAddress.isPending}>
                                        {t("addresses.add")}
                                    </Button>
                                </form>
                            </Card>
                        </div>
                    </div>
                ) : (
                    <EmptyState compact icon="groups" title={t("detail.empty")} />
                )}
            </Card>
        </div>
    )
}
