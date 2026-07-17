"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { Field, SelectField } from "@/components/ui/field"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Skeleton } from "@/components/ui/skeleton"
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
    const t = useTranslations("organization.admin")
    const commonT = useTranslations("common")
    const [confirm, confirmDialog] = useConfirm()
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

    async function removeRole(role: OrganizationRole) {
        const ok = await confirm({
            title: t("deleteRoleConfirmTitle", { name: role.name }),
            message: t("deleteRoleConfirmMessage"),
            confirmLabel: commonT("delete"),
            cancelLabel: commonT("cancel"),
            danger: true,
        })
        if (!ok) return

        if (editingRoleId === role.id) cancelEdit()
        void deleteRole.mutateAsync(role.id)
    }

    return (
        <div className="grid gap-6">
        {confirmDialog}
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card padding="lg">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                        <h2 className="type-section">{t("membersTitle")}</h2>
                        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                            {t("membersDescription")}
                        </p>
                    </div>
                    <StatusPill tone="neutral">{memberships.length}</StatusPill>
                </div>

                <div className="grid gap-2">
                    {membershipsLoading ? (
                        <div className="grid gap-2" aria-hidden="true">
                            {Array.from({ length: 3 }).map((_, row) => (
                                <Skeleton key={row} className="h-14 rounded-md" />
                            ))}
                        </div>
                    ) : memberships.length > 0 ? (
                        memberships.map((membership) => (
                            <div
                                key={membership.id}
                                className="flex items-center justify-between gap-3 rounded-md bg-surface-muted px-4 py-3"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-ink">
                                        {membership.user?.name ?? t("userFallback", { id: membership.user_id })}
                                    </p>
                                    <p className="truncate text-xs font-medium text-ink-muted">
                                        {membership.user?.email ?? t("noEmail")}
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
                        <EmptyState compact icon="groups" title={t("membersEmpty")} />
                    )}
                </div>
            </Card>

            <Card padding="lg">
                <div className="mb-5">
                    <h2 className="type-section">{t("rolesTitle")}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                        {t("rolesDescription")}
                    </p>
                </div>

                <div className="grid gap-2">
                    {rolesLoading ? (
                        <div className="grid gap-2" aria-hidden="true">
                            {Array.from({ length: 3 }).map((_, row) => (
                                <Skeleton key={row} className="h-14 rounded-md" />
                            ))}
                        </div>
                    ) : (
                        roles.map((role) => (
                            <div
                                key={role.id}
                                className="rounded-md bg-surface-muted p-4"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-ink">{role.name}</p>
                                        <p className="mt-1 text-xs text-ink-muted">
                                            {t("permissionsCount", { count: role.permissions.length })}
                                        </p>
                                    </div>
                                    {role.is_builtin ? (
                                        <Button type="button" variant="outline" size="sm" disabled>
                                            {t("builtIn")}
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
                                                {commonT("edit")}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                disabled={!canManage || deleteRole.isPending}
                                                onClick={() => void removeRole(role)}
                                            >
                                                {commonT("delete")}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {role.permissions.length > 0 ? (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {role.permissions.slice(0, 6).map((permission) => (
                                            <span
                                                key={permission}
                                                className="rounded-pill bg-surface px-2 py-1 text-[10px] font-semibold text-ink-secondary"
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

                <form onSubmit={submitRole} className="mt-6 border-t border-line pt-6">
                    <Field
                        label={t("roleName")}
                        value={roleName}
                        onChange={(event) => setRoleName(event.target.value)}
                        placeholder="warehouse-lead"
                        disabled={!canManage}
                    />

                    <div className="mt-4 grid gap-4">
                        {permissionsLoading ? (
                            <p className="text-sm text-ink-muted">{t("permissionsLoading")}</p>
                        ) : (
                            permissionGroups.map((group) => (
                                <div key={group.key} className="rounded-md bg-surface-muted p-3">
                                    <p className="type-card-label mb-2 uppercase tracking-wider">
                                        {group.label}
                                    </p>
                                    <div className="grid gap-2">
                                        {group.permissions.map((permission) => (
                                            <label
                                                key={permission.key}
                                                className="flex items-start gap-2 text-xs font-medium text-ink-secondary"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="mt-0.5 h-4 w-4 accent-brand"
                                                    checked={selectedPermissions.includes(permission.key)}
                                                    disabled={!canManage}
                                                    onChange={(event) =>
                                                        togglePermission(permission.key, event.target.checked)
                                                    }
                                                />
                                                <span>
                                                    {permission.label}
                                                    <span className="ml-1 text-ink-faint">{permission.key}</span>
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
                                {t("saveChanges")}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                size="xl"
                                onClick={cancelEdit}
                            >
                                {commonT("cancel")}
                            </Button>
                        </div>
                    ) : (
                        <Button
                            type="submit"
                            className="mt-5 w-full"
                            size="xl"
                            disabled={!canManage || createRole.isPending}
                        >
                            {t("createRole")}
                        </Button>
                    )}
                </form>
            </Card>
        </section>

        <Card as="section" padding="lg">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="type-section">{t("branchRolesTitle")}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                        {t("branchRolesDescription")}
                    </p>
                </div>
                <SelectField
                    label={t("branch")}
                    value={selectedBranchId ?? ""}
                    onChange={(event) => setSelectedBranchId(event.target.value ? Number(event.target.value) : null)}
                    className="min-w-48"
                >
                    {branches.length === 0 ? <option value="">{t("noBranches")}</option> : null}
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
                        <div className="grid gap-2" aria-hidden="true">
                            {Array.from({ length: 3 }).map((_, row) => (
                                <Skeleton key={row} className="h-14 rounded-md" />
                            ))}
                        </div>
                    ) : branchAssignments.length > 0 ? (
                        branchAssignments.map((assignment) => (
                            <div
                                key={assignment.id}
                                className="flex items-center justify-between gap-3 rounded-md bg-surface-muted px-4 py-3"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-ink">
                                        {assignment.user?.name ?? t("userFallback", { id: assignment.user_id })}
                                    </p>
                                    <p className="truncate text-xs font-medium text-ink-muted">
                                        {assignment.role?.name ?? t("roleFallback", { id: assignment.role_id })}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-label={t("revokeAria", {
                                        name:
                                            assignment.user?.name ??
                                            t("userFallback", { id: assignment.user_id }),
                                    })}
                                    disabled={!canManage || revokeBranchRole.isPending}
                                    onClick={() => void revokeBranchRole.mutateAsync(assignment.user_id)}
                                >
                                    {t("revoke")}
                                </Button>
                            </div>
                        ))
                    ) : (
                        <EmptyState compact icon="manage_accounts" title={t("assignmentsEmpty")} />
                    )}
                </div>

                <form className="grid gap-4" onSubmit={submitBranchAssignment}>
                    <SearchableSelect
                        label={t("assignMember")}
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
                                    : t("userFallback", { id: membership.user_id }),
                            }))}
                        placeholder={t("assignMemberPlaceholder")}
                        disabled={!canManage}
                    />
                    <SelectField
                        label={t("assignRole")}
                        value={assignmentForm.role_id}
                        onChange={(event) =>
                            setAssignmentForm((current) => ({ ...current, role_id: event.target.value }))
                        }
                        disabled={!canManage}
                    >
                        <option value="">{t("selectRole")}</option>
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
                        {t("assignSubmit")}
                    </Button>
                </form>
            </div>
        </Card>
        </div>
    )
}
