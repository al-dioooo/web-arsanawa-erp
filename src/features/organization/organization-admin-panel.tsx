"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Field, SelectField } from "@/components/ui/field"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StatusPill } from "@/components/ui/status-pill"
import {
    useAssignBranchRole,
    useBranchAssignments,
    useCreateOrganizationRole,
    useDeleteOrganizationRole,
    useOrganizationMemberships,
    useOrganizationPermissions,
    useOrganizationRoles,
    useRevokeBranchRole,
    useUpdateOrganizationRole,
    type OrganizationRole,
} from "@/features/organization/organization-api"
import type { Branch } from "@/lib/types"

type OrganizationAdminPanelProps = {
    companyId: number | null
    canManage: boolean
    branches?: Branch[]
}

export function OrganizationAdminPanel({ companyId, canManage, branches = [] }: OrganizationAdminPanelProps) {
    const { data: memberships = [], isLoading: membershipsLoading } =
        useOrganizationMemberships(companyId)
    const { data: permissionCatalog = {}, isLoading: permissionsLoading } =
        useOrganizationPermissions()
    const { data: roles = [], isLoading: rolesLoading } = useOrganizationRoles(companyId)
    const createRole = useCreateOrganizationRole(companyId)
    const updateRole = useUpdateOrganizationRole(companyId)
    const deleteRole = useDeleteOrganizationRole(companyId)

    const [roleName, setRoleName] = useState("")
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
    const [editingRoleId, setEditingRoleId] = useState<number | null>(null)
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(branches[0]?.id ?? null)
    const [assignmentForm, setAssignmentForm] = useState({ user_id: "", role_id: "" })
    const { data: branchAssignments = [], isLoading: branchAssignmentsLoading } =
        useBranchAssignments(companyId, selectedBranchId)
    const assignBranchRole = useAssignBranchRole(companyId, selectedBranchId)
    const revokeBranchRole = useRevokeBranchRole(companyId, selectedBranchId)

    useEffect(() => {
        if (!selectedBranchId && branches[0]) {
            let active = true
            void Promise.resolve().then(() => {
                if (active) setSelectedBranchId(branches[0].id)
            })
            return () => {
                active = false
            }
        }
    }, [branches, selectedBranchId])

    const permissionGroups = useMemo(
        () =>
            Object.entries(permissionCatalog).map(([key, group]) => ({
                key,
                ...group,
            })),
        [permissionCatalog],
    )

    function startEdit(role: OrganizationRole) {
        setEditingRoleId(role.id)
        setRoleName(role.name)
        setSelectedPermissions([...role.permissions])
    }

    function cancelEdit() {
        setEditingRoleId(null)
        setRoleName("")
        setSelectedPermissions([])
    }

    async function submitRole(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!companyId || !roleName.trim()) return

        if (editingRoleId != null) {
            await updateRole.mutateAsync({
                roleId: editingRoleId,
                input: {
                    name: roleName.trim(),
                    permissions: selectedPermissions,
                },
            })
            cancelEdit()
            return
        }

        await createRole.mutateAsync({
            name: roleName.trim(),
            permissions: selectedPermissions,
        })
        setRoleName("")
        setSelectedPermissions([])
    }

    async function submitBranchAssignment(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!companyId || !selectedBranchId || !assignmentForm.user_id || !assignmentForm.role_id) return

        await assignBranchRole.mutateAsync({
            user_id: Number(assignmentForm.user_id),
            role_id: Number(assignmentForm.role_id),
        })
        setAssignmentForm({ user_id: "", role_id: "" })
    }

    function togglePermission(key: string, checked: boolean) {
        setSelectedPermissions((current) =>
            checked ? [...new Set([...current, key])] : current.filter((item) => item !== key),
        )
    }

    return (
        <div className="grid gap-6">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="rounded-2xl border border-navy-100 bg-white p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-navy-900 font-display">
                            Members
                        </h2>
                        <p className="mt-1 text-xs leading-relaxed text-navy-500">
                            Active company memberships and their default organization role.
                        </p>
                    </div>
                    <StatusPill tone="neutral">{memberships.length}</StatusPill>
                </div>

                <div className="grid gap-2">
                    {membershipsLoading ? (
                        <p className="rounded-xl border border-dashed border-navy-100 bg-navy-50/30 p-4 text-sm text-navy-500">
                            Loading members...
                        </p>
                    ) : memberships.length > 0 ? (
                        memberships.map((membership) => (
                            <div
                                key={membership.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-navy-100 bg-navy-50/20 px-4 py-3"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-navy-900">
                                        {membership.user?.name ?? `User #${membership.user_id}`}
                                    </p>
                                    <p className="truncate text-xs font-medium text-navy-500">
                                        {membership.user?.email ?? "No email loaded"}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <StatusPill tone={membership.status === "active" ? "green" : "neutral"}>
                                        {membership.status}
                                    </StatusPill>
                                    <StatusPill tone="neutral">{membership.role}</StatusPill>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="rounded-xl border border-dashed border-navy-100 bg-navy-50/30 p-4 text-sm text-navy-500">
                            No members found for this company.
                        </p>
                    )}
                </div>
            </div>

            <div className="rounded-2xl border border-navy-100 bg-white p-6">
                <div className="mb-5">
                    <h2 className="text-lg font-bold text-navy-900 font-display">Roles</h2>
                    <p className="mt-1 text-xs leading-relaxed text-navy-500">
                        Build custom roles from the API permission catalog.
                    </p>
                </div>

                <div className="grid gap-2">
                    {rolesLoading ? (
                        <p className="rounded-xl border border-dashed border-navy-100 bg-navy-50/30 p-4 text-sm text-navy-500">
                            Loading roles...
                        </p>
                    ) : (
                        roles.map((role) => (
                            <div
                                key={role.id}
                                className="rounded-xl border border-navy-100 bg-navy-50/20 p-4"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-navy-900">{role.name}</p>
                                        <p className="mt-1 text-xs text-navy-500">
                                            {role.permissions.length} permissions
                                        </p>
                                    </div>
                                    {role.is_builtin ? (
                                        <Button type="button" variant="outline" size="sm" disabled>
                                            Built-in
                                        </Button>
                                    ) : (
                                        <div className="flex shrink-0 items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={!canManage}
                                                onClick={() => startEdit(role)}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                disabled={!canManage || deleteRole.isPending}
                                                onClick={() => {
                                                    if (editingRoleId === role.id) cancelEdit()
                                                    void deleteRole.mutateAsync(role.id)
                                                }}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {role.permissions.length > 0 ? (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {role.permissions.slice(0, 6).map((permission) => (
                                            <span
                                                key={permission}
                                                className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-navy-600"
                                            >
                                                {permission}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ))
                    )}
                </div>

                <form onSubmit={submitRole} className="mt-6 border-t border-navy-100/55 pt-6">
                    <Field
                        label="Role name"
                        value={roleName}
                        onChange={(event) => setRoleName(event.target.value)}
                        placeholder="warehouse-lead"
                        disabled={!canManage}
                    />

                    <div className="mt-4 grid gap-4">
                        {permissionsLoading ? (
                            <p className="text-sm text-navy-500">Loading permission catalog...</p>
                        ) : (
                            permissionGroups.map((group) => (
                                <div key={group.key} className="rounded-xl border border-navy-100 p-3">
                                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-500">
                                        {group.label}
                                    </p>
                                    <div className="grid gap-2">
                                        {group.permissions.map((permission) => (
                                            <label
                                                key={permission.key}
                                                className="flex items-start gap-2 text-xs font-medium text-navy-700"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="mt-0.5 h-4 w-4 rounded border-navy-200 text-teal-700"
                                                    checked={selectedPermissions.includes(permission.key)}
                                                    disabled={!canManage}
                                                    onChange={(event) =>
                                                        togglePermission(permission.key, event.target.checked)
                                                    }
                                                />
                                                <span>
                                                    {permission.label}
                                                    <span className="ml-1 text-navy-400">{permission.key}</span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {editingRoleId != null ? (
                        <div className="mt-5 grid gap-2">
                            <Button
                                type="submit"
                                className="w-full"
                                size="xl"
                                disabled={!canManage || updateRole.isPending}
                            >
                                Save changes
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                size="xl"
                                onClick={cancelEdit}
                            >
                                Cancel
                            </Button>
                        </div>
                    ) : (
                        <Button
                            type="submit"
                            className="mt-5 w-full"
                            size="xl"
                            disabled={!canManage || createRole.isPending}
                        >
                            Create role
                        </Button>
                    )}
                </form>
            </div>
        </section>

        <section className="rounded-2xl border border-navy-100 bg-white p-6">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-lg font-bold text-navy-900 font-display">
                        Branch Role Assignments
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-navy-500">
                        Assign custom roles to users for the selected branch.
                    </p>
                </div>
                <SelectField
                    label="Branch"
                    value={selectedBranchId ?? ""}
                    onChange={(event) => setSelectedBranchId(event.target.value ? Number(event.target.value) : null)}
                    className="min-w-48"
                >
                    {branches.length === 0 ? <option value="">No branches</option> : null}
                    {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                            {branch.name}
                        </option>
                    ))}
                </SelectField>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="grid gap-2">
                    {branchAssignmentsLoading ? (
                        <p className="rounded-xl border border-dashed border-navy-100 bg-navy-50/30 p-4 text-sm text-navy-500">
                            Loading branch assignments...
                        </p>
                    ) : branchAssignments.length > 0 ? (
                        branchAssignments.map((assignment) => (
                            <div
                                key={assignment.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-navy-100 bg-navy-50/20 px-4 py-3"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-navy-900">
                                        {assignment.user?.name ?? `User #${assignment.user_id}`}
                                    </p>
                                    <p className="truncate text-xs font-medium text-navy-500">
                                        {assignment.role?.name ?? `Role #${assignment.role_id}`}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-label={`Revoke ${assignment.user?.name ?? `User #${assignment.user_id}`}`}
                                    disabled={!canManage || revokeBranchRole.isPending}
                                    onClick={() => void revokeBranchRole.mutateAsync(assignment.user_id)}
                                >
                                    Revoke
                                </Button>
                            </div>
                        ))
                    ) : (
                        <p className="rounded-xl border border-dashed border-navy-100 bg-navy-50/30 p-4 text-sm text-navy-500">
                            No branch assignments for this branch.
                        </p>
                    )}
                </div>

                <form className="grid gap-4" onSubmit={submitBranchAssignment}>
                    <SearchableSelect
                        label="Assign member"
                        value={assignmentForm.user_id}
                        onChange={(value) =>
                            setAssignmentForm((current) => ({ ...current, user_id: String(value) }))
                        }
                        options={memberships
                            .filter((membership) => membership.status === "active")
                            .map((membership) => ({
                                value: membership.user_id,
                                label: membership.user
                                    ? `${membership.user.name} (${membership.user.email})`
                                    : `User #${membership.user_id}`,
                            }))}
                        placeholder="Search company members"
                        disabled={!canManage}
                    />
                    <SelectField
                        label="Assign role"
                        value={assignmentForm.role_id}
                        onChange={(event) =>
                            setAssignmentForm((current) => ({ ...current, role_id: event.target.value }))
                        }
                        disabled={!canManage}
                    >
                        <option value="">Select role</option>
                        {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                                {role.name}
                            </option>
                        ))}
                    </SelectField>
                    <Button
                        type="submit"
                        size="xl"
                        disabled={!canManage || !selectedBranchId || assignBranchRole.isPending}
                    >
                        Assign branch role
                    </Button>
                </form>
            </div>
        </section>
        </div>
    )
}
