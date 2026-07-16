"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Field, SelectField } from "@/components/ui/field"
import { PageHeaderShell } from "@/components/ui/page-header-shell"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StatusPill } from "@/components/ui/status-pill"
import { CompanyCreateForm } from "@/features/organization/company-create-form"
import { useSession } from "@/features/auth/session-provider"
import { canManageOrganization } from "@/features/auth/access"
import { OrganizationAdminPanel } from "@/features/organization/organization-admin-panel"

export function OrganizationView() {
    const {
        activeCompanyId,
        companies,
        organizationContext,
        user,
        error,
        createBranch,
        addMembership,
        isLoading
    } = useSession()

    const [branchForm, setBranchForm] = useState({ name: "", code: "" })
    const [membershipForm, setMembershipForm] = useState({ user_id: "", branch_id: "", role: "member" })
    const activeCompany = companies.find((entry) => entry.company.id === activeCompanyId)
    const canManage = canManageOrganization(organizationContext?.membership, user)

    async function submitBranch(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!activeCompanyId) return

        await createBranch(activeCompanyId, {
            name: branchForm.name,
            code: branchForm.code || undefined
        })
        setBranchForm({ name: "", code: "" })
    }

    async function submitMembership(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!activeCompanyId) return

        await addMembership(activeCompanyId, {
            user_id: Number(membershipForm.user_id),
            branch_id: membershipForm.branch_id ? Number(membershipForm.branch_id) : null,
            role: membershipForm.role as "admin" | "member"
        })
        setMembershipForm({ user_id: "", branch_id: "", role: "member" })
    }

    return (
        <div className="grid gap-6">
            {/* Header section */}
            <PageHeaderShell
                eyebrow="Organization"
                title={activeCompany?.company.name ?? "Companies & Structure"}
                subtitle="Manage branches, company memberships, and general organizational structure."
            >
                {user?.is_developer ? (
                    <StatusPill tone="green">Developer</StatusPill>
                ) : organizationContext?.membership ? (
                    <StatusPill tone="green">
                        {organizationContext.membership.role}
                    </StatusPill>
                ) : null}
            </PageHeaderShell>
            {error ? (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
                    {error}
                </div>
            ) : null}

            {/* Create Company Section */}
            <section className="rounded-2xl border border-navy-100 bg-white p-6">
                <h2 className="text-lg font-bold text-navy-900 font-display mb-4">Create Company</h2>
                <CompanyCreateForm />
            </section>

            <OrganizationAdminPanel
                companyId={activeCompanyId}
                canManage={canManage}
                branches={organizationContext?.branches ?? []}
            />

            <section className="grid gap-6 xl:grid-cols-2">
                {/* Branches Manager */}
                <div className="rounded-2xl border border-navy-100 bg-white p-6">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <h2 className="text-lg font-bold text-navy-900 font-display">Branches</h2>
                        <StatusPill tone="neutral">{organizationContext?.branches.length ?? 0}</StatusPill>
                    </div>

                    <div className="grid gap-2 max-h-60 overflow-y-auto pr-1">
                        {organizationContext?.branches.map((branch) => (
                            <div
                                key={branch.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-navy-100 bg-navy-50/20 px-4 py-3"
                            >
                                <div>
                                    <p className="text-sm font-bold text-navy-900 leading-tight">{branch.name}</p>
                                    <p className="text-xs text-navy-500 font-medium mt-0.5">{branch.code ?? "No code"}</p>
                                </div>
                                {branch.is_primary ? <StatusPill tone="green">Primary</StatusPill> : null}
                            </div>
                        ))}
                        {(!organizationContext?.branches || organizationContext.branches.length === 0) && (
                            <p className="text-xs text-navy-450 text-center py-6 font-medium">No branches created yet</p>
                        )}
                    </div>

                    <form onSubmit={submitBranch} className="mt-6 pt-6 border-t border-navy-100/55 grid gap-4">
                        <h3 className="text-sm font-bold text-navy-900 font-display">Add New Branch</h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field
                                label="Branch name"
                                value={branchForm.name}
                                onChange={(event) =>
                                    setBranchForm((current) => ({ ...current, name: event.target.value }))
                                }
                                required
                            />
                            <Field
                                label="Code"
                                value={branchForm.code}
                                onChange={(event) =>
                                    setBranchForm((current) => ({ ...current, code: event.target.value }))
                                }
                                placeholder="HQ"
                            />
                        </div>
                        <Button type="submit" variant="secondary" size="xl" className="w-full cursor-pointer" disabled={!activeCompanyId || isLoading}>
                            Add Branch
                        </Button>
                    </form>
                </div>

                {/* Add Member Manager */}
                <div className="rounded-2xl border border-navy-100 bg-white p-6 flex flex-col">
                    <h2 className="text-lg font-bold text-navy-900 font-display mb-4">Add Member</h2>
                    <form onSubmit={submitMembership} className="grid gap-4 flex-1">
                        <Field
                            label="User ID"
                            type="number"
                            min="1"
                            value={membershipForm.user_id}
                            onChange={(event) =>
                                setMembershipForm((current) => ({ ...current, user_id: event.target.value }))
                            }
                            required
                        />
                        <SearchableSelect
                            label="Branch Assignment"
                            value={membershipForm.branch_id}
                            onChange={(val) =>
                                setMembershipForm((current) => ({ ...current, branch_id: String(val) }))
                            }
                            options={organizationContext?.branches.map((branch) => ({
                                value: branch.id,
                                label: branch.name
                            })) || []}
                            placeholder="No branch assignment (Company-wide)"
                        />
                        <SelectField
                            label="System Role"
                            value={membershipForm.role}
                            onChange={(event) =>
                                setMembershipForm((current) => ({ ...current, role: event.target.value }))
                            }
                        >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                        </SelectField>
                        <div className="mt-auto pt-6">
                            <Button type="submit" variant="secondary" size="xl" className="w-full cursor-pointer" disabled={!activeCompanyId || isLoading}>
                                Add Member
                            </Button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    )
}
