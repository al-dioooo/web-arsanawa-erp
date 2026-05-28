"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest, jsonBody } from "@/lib/api-client"

export type PartnerType = "customer" | "supplier" | "both"
export type PartnerStatus = "active" | "inactive"

export type PartnerContact = {
    id: number
    partner_id: number
    name: string
    role: string | null
    email: string | null
    phone: string | null
    is_primary: boolean
}

export type PartnerAddress = {
    id: number
    partner_id: number
    type: "billing" | "shipping" | "other"
    label: string | null
    address_line_1: string
    address_line_2: string | null
    city: string | null
    province: string | null
    postal_code: string | null
    country: string | null
    is_default: boolean
}

export type Partner = {
    id: number
    company_id: number
    type: PartnerType
    name: string
    code: string | null
    email: string | null
    phone: string | null
    tax_identifier: string | null
    national_id: string | null
    credit_limit: string | null
    transaction_limit: string | null
    status: PartnerStatus
    notes: string | null
    contacts?: PartnerContact[]
    addresses?: PartnerAddress[]
}

export type PartnerInput = {
    name: string
    type: PartnerType
    code?: string | null
    email?: string | null
    phone?: string | null
    tax_identifier?: string | null
    national_id?: string | null
    credit_limit?: number | string | null
    transaction_limit?: number | string | null
    status?: PartnerStatus
    notes?: string | null
}

export type PartnerFilters = {
    type?: PartnerType
    status?: PartnerStatus | string
    search?: string
    per_page?: number
}

export type PartnerContactInput = {
    name?: string
    role?: string | null
    email?: string | null
    phone?: string | null
    is_primary?: boolean
}

export type PartnerAddressInput = {
    type?: "billing" | "shipping" | "other"
    label?: string | null
    address_line_1?: string
    address_line_2?: string | null
    city?: string | null
    province?: string | null
    postal_code?: string | null
    country?: string | null
    is_default?: boolean
}

function queryString(params: Record<string, string | number | null | undefined>): string {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
            search.set(key, String(value))
        }
    })

    const value = search.toString()
    return value ? `?${value}` : ""
}

export async function listPartners(filters: PartnerFilters = {}) {
    const response = await apiRequest<{ partners: Partner[] }>(
        `/api/v1/partners${queryString(filters)}`,
    )

    return response.data.partners
}

export async function getPartner(partnerId: number) {
    const response = await apiRequest<{ partner: Partner }>(`/api/v1/partners/${partnerId}`)

    return response.data.partner
}

export async function createPartner(input: PartnerInput) {
    const response = await apiRequest<{ partner: Partner }>("/api/v1/partners", {
        method: "POST",
        body: jsonBody(input),
    })

    return response.data.partner
}

export async function updatePartner(partnerId: number, input: Partial<PartnerInput>) {
    const response = await apiRequest<{ partner: Partner }>(`/api/v1/partners/${partnerId}`, {
        method: "PATCH",
        body: jsonBody(input),
    })

    return response.data.partner
}

export async function deletePartner(partnerId: number) {
    return apiRequest<null>(`/api/v1/partners/${partnerId}`, { method: "DELETE" })
}

export async function createPartnerContact(partnerId: number, input: PartnerContactInput) {
    const response = await apiRequest<{ contact: PartnerContact }>(
        `/api/v1/partners/${partnerId}/contacts`,
        {
            method: "POST",
            body: jsonBody(input),
        },
    )

    return response.data.contact
}

export async function updatePartnerContact(
    partnerId: number,
    contactId: number,
    input: PartnerContactInput,
) {
    const response = await apiRequest<{ contact: PartnerContact }>(
        `/api/v1/partners/${partnerId}/contacts/${contactId}`,
        {
            method: "PATCH",
            body: jsonBody(input),
        },
    )

    return response.data.contact
}

export async function deletePartnerContact(partnerId: number, contactId: number) {
    return apiRequest<null>(`/api/v1/partners/${partnerId}/contacts/${contactId}`, {
        method: "DELETE",
    })
}

export async function createPartnerAddress(partnerId: number, input: PartnerAddressInput) {
    const response = await apiRequest<{ address: PartnerAddress }>(
        `/api/v1/partners/${partnerId}/addresses`,
        {
            method: "POST",
            body: jsonBody(input),
        },
    )

    return response.data.address
}

export async function updatePartnerAddress(
    partnerId: number,
    addressId: number,
    input: PartnerAddressInput,
) {
    const response = await apiRequest<{ address: PartnerAddress }>(
        `/api/v1/partners/${partnerId}/addresses/${addressId}`,
        {
            method: "PATCH",
            body: jsonBody(input),
        },
    )

    return response.data.address
}

export async function deletePartnerAddress(partnerId: number, addressId: number) {
    return apiRequest<null>(`/api/v1/partners/${partnerId}/addresses/${addressId}`, {
        method: "DELETE",
    })
}

export function usePartners(filters: PartnerFilters = {}) {
    return useQuery({
        queryKey: ["partners", filters],
        queryFn: () => listPartners(filters),
    })
}

export function usePartner(partnerId: number | null) {
    return useQuery({
        queryKey: ["partners", partnerId],
        queryFn: () => getPartner(partnerId as number),
        enabled: Boolean(partnerId),
    })
}

export function useCreatePartner() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createPartner,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["partners"] })
        },
    })
}

export function useUpdatePartner() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ partnerId, input }: { partnerId: number; input: Partial<PartnerInput> }) =>
            updatePartner(partnerId, input),
        onSuccess: (partner) => {
            void queryClient.invalidateQueries({ queryKey: ["partners"] })
            void queryClient.invalidateQueries({ queryKey: ["partners", partner.id] })
        },
    })
}

export function useDeletePartner() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deletePartner,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["partners"] })
        },
    })
}

export function useCreatePartnerContact() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ partnerId, input }: { partnerId: number; input: PartnerContactInput }) =>
            createPartnerContact(partnerId, input),
        onSuccess: (_contact, variables) => {
            void queryClient.invalidateQueries({ queryKey: ["partners", variables.partnerId] })
        },
    })
}

export function useUpdatePartnerContact() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            partnerId,
            contactId,
            input,
        }: {
            partnerId: number
            contactId: number
            input: PartnerContactInput
        }) => updatePartnerContact(partnerId, contactId, input),
        onSuccess: (_contact, variables) => {
            void queryClient.invalidateQueries({ queryKey: ["partners", variables.partnerId] })
        },
    })
}

export function useDeletePartnerContact() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ partnerId, contactId }: { partnerId: number; contactId: number }) =>
            deletePartnerContact(partnerId, contactId),
        onSuccess: (_response, variables) => {
            void queryClient.invalidateQueries({ queryKey: ["partners", variables.partnerId] })
        },
    })
}

export function useCreatePartnerAddress() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ partnerId, input }: { partnerId: number; input: PartnerAddressInput }) =>
            createPartnerAddress(partnerId, input),
        onSuccess: (_address, variables) => {
            void queryClient.invalidateQueries({ queryKey: ["partners", variables.partnerId] })
        },
    })
}

export function useUpdatePartnerAddress() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            partnerId,
            addressId,
            input,
        }: {
            partnerId: number
            addressId: number
            input: PartnerAddressInput
        }) => updatePartnerAddress(partnerId, addressId, input),
        onSuccess: (_address, variables) => {
            void queryClient.invalidateQueries({ queryKey: ["partners", variables.partnerId] })
        },
    })
}

export function useDeletePartnerAddress() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ partnerId, addressId }: { partnerId: number; addressId: number }) =>
            deletePartnerAddress(partnerId, addressId),
        onSuccess: (_response, variables) => {
            void queryClient.invalidateQueries({ queryKey: ["partners", variables.partnerId] })
        },
    })
}
