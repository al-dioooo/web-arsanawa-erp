"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest, jsonBody } from "@/lib/api-client"
import type { Membership } from "@/lib/types"

export type PermissionCatalogItem = {
    key: string
    label: string
}

export type PermissionCatalogGroup = {
    label: string
    permissions: PermissionCatalogItem[]
}

export type PermissionCatalog = Record<string, PermissionCatalogGroup>

export type OrganizationRole = {
    id: number
    name: string
    is_builtin: boolean
    permissions: string[]
}

export type BranchAssignment = {
    id: number
    company_id: number
    branch_id: number
    user_id: number
    role_id: number
    status: string
    role?: {
        id: number
        name: string
    }
    user?: {
        id: number
        name: string
        email: string
    }
}

export type ExternalApiKey = {
    id: number
    company_id: number
    name: string
    token_prefix: string
    source_channel: string
    last_used_at: string | null
    expires_at: string | null
    revoked_at: string | null
    revoked: boolean
    created_at: string | null
    updated_at: string | null
}

export type RoleInput = {
    name: string
    permissions: string[]
}

export type ExternalApiKeyInput = {
    name: string
    source_channel: string
    expires_at?: string | null
}

export type ExternalApiKeySecret = {
    api_key: ExternalApiKey
    plain_text_key: string
}

export type BranchRoleInput = {
    user_id: number
    role_id: number
}

export async function listOrganizationMemberships(companyId: number) {
    const response = await apiRequest<{ memberships: Membership[] }>(
        `/api/v1/organization/companies/${companyId}/memberships`,
    )

    return response.data.memberships
}

export async function listOrganizationPermissions() {
    const response = await apiRequest<{ permissions: PermissionCatalog }>(
        "/api/v1/organization/permissions",
    )

    return response.data.permissions
}

export async function listOrganizationRoles(companyId: number) {
    const response = await apiRequest<{ roles: OrganizationRole[] }>(
        `/api/v1/organization/companies/${companyId}/roles`,
    )

    return response.data.roles
}

export async function listExternalApiKeys(companyId: number) {
    const response = await apiRequest<{ api_keys: ExternalApiKey[] }>(
        `/api/v1/organization/companies/${companyId}/api-keys`,
    )

    return response.data.api_keys
}

export async function createExternalApiKey(companyId: number, input: ExternalApiKeyInput) {
    const response = await apiRequest<ExternalApiKeySecret>(
        `/api/v1/organization/companies/${companyId}/api-keys`,
        {
            method: "POST",
            body: jsonBody(input),
        },
    )

    return response.data
}

export async function rotateExternalApiKey(companyId: number, apiKeyId: number) {
    const response = await apiRequest<ExternalApiKeySecret>(
        `/api/v1/organization/companies/${companyId}/api-keys/${apiKeyId}/rotate`,
        { method: "POST" },
    )

    return response.data
}

export async function revokeExternalApiKey(companyId: number, apiKeyId: number) {
    const response = await apiRequest<{ api_key: ExternalApiKey }>(
        `/api/v1/organization/companies/${companyId}/api-keys/${apiKeyId}/revoke`,
        { method: "POST" },
    )

    return response.data.api_key
}

export async function createOrganizationRole(companyId: number, input: RoleInput) {
    const response = await apiRequest<{ role: OrganizationRole }>(
        `/api/v1/organization/companies/${companyId}/roles`,
        {
            method: "POST",
            body: jsonBody(input),
        },
    )

    return response.data.role
}

export async function updateOrganizationRole(
    companyId: number,
    roleId: number,
    input: Partial<RoleInput>,
) {
    const response = await apiRequest<{ role: OrganizationRole }>(
        `/api/v1/organization/companies/${companyId}/roles/${roleId}`,
        {
            method: "PUT",
            body: jsonBody(input),
        },
    )

    return response.data.role
}

export async function deleteOrganizationRole(companyId: number, roleId: number) {
    return apiRequest<null>(
        `/api/v1/organization/companies/${companyId}/roles/${roleId}`,
        { method: "DELETE" },
    )
}

export async function listBranchAssignments(companyId: number, branchId: number) {
    const response = await apiRequest<{ assignments: BranchAssignment[] }>(
        `/api/v1/organization/companies/${companyId}/branches/${branchId}/assignments`,
    )

    return response.data.assignments
}

export async function assignBranchRole(
    companyId: number,
    branchId: number,
    input: BranchRoleInput,
) {
    const response = await apiRequest<{ assignment: BranchAssignment }>(
        `/api/v1/organization/companies/${companyId}/branches/${branchId}/assignments`,
        {
            method: "POST",
            body: jsonBody(input),
        },
    )

    return response.data.assignment
}

export async function revokeBranchRole(companyId: number, branchId: number, userId: number) {
    return apiRequest<null>(
        `/api/v1/organization/companies/${companyId}/branches/${branchId}/assignments/${userId}`,
        { method: "DELETE" },
    )
}

export function useOrganizationMemberships(companyId: number | null) {
    return useQuery({
        queryKey: ["organization", "memberships", companyId],
        queryFn: () => listOrganizationMemberships(companyId as number),
        enabled: Boolean(companyId),
    })
}

export function useOrganizationPermissions() {
    return useQuery({
        queryKey: ["organization", "permissions"],
        queryFn: listOrganizationPermissions,
    })
}

export function useOrganizationRoles(companyId: number | null) {
    return useQuery({
        queryKey: ["organization", "roles", companyId],
        queryFn: () => listOrganizationRoles(companyId as number),
        enabled: Boolean(companyId),
    })
}

export function useExternalApiKeys(companyId: number | null) {
    return useQuery({
        queryKey: ["organization", "api-keys", companyId],
        queryFn: () => listExternalApiKeys(companyId as number),
        enabled: Boolean(companyId),
    })
}

export function useCreateExternalApiKey(companyId: number | null) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (input: ExternalApiKeyInput) => createExternalApiKey(companyId as number, input),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["organization", "api-keys", companyId] })
        },
    })
}

export function useRotateExternalApiKey(companyId: number | null) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (apiKeyId: number) => rotateExternalApiKey(companyId as number, apiKeyId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["organization", "api-keys", companyId] })
        },
    })
}

export function useRevokeExternalApiKey(companyId: number | null) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (apiKeyId: number) => revokeExternalApiKey(companyId as number, apiKeyId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["organization", "api-keys", companyId] })
        },
    })
}

export function useCreateOrganizationRole(companyId: number | null) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (input: RoleInput) => createOrganizationRole(companyId as number, input),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["organization", "roles", companyId] })
        },
    })
}

export function useUpdateOrganizationRole(companyId: number | null) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ roleId, input }: { roleId: number; input: Partial<RoleInput> }) =>
            updateOrganizationRole(companyId as number, roleId, input),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["organization", "roles", companyId] })
        },
    })
}

export function useDeleteOrganizationRole(companyId: number | null) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (roleId: number) => deleteOrganizationRole(companyId as number, roleId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["organization", "roles", companyId] })
        },
    })
}

export function useBranchAssignments(companyId: number | null, branchId: number | null) {
    return useQuery({
        queryKey: ["organization", "branch-assignments", companyId, branchId],
        queryFn: () => listBranchAssignments(companyId as number, branchId as number),
        enabled: Boolean(companyId && branchId),
    })
}

export function useAssignBranchRole(companyId: number | null, branchId: number | null) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (input: BranchRoleInput) =>
            assignBranchRole(companyId as number, branchId as number, input),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ["organization", "branch-assignments", companyId, branchId],
            })
        },
    })
}

export function useRevokeBranchRole(companyId: number | null, branchId: number | null) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (userId: number) => revokeBranchRole(companyId as number, branchId as number, userId),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ["organization", "branch-assignments", companyId, branchId],
            })
        },
    })
}
