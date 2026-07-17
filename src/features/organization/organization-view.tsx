"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Field, SelectField } from "@/components/ui/field"
import { PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StatusPill } from "@/components/ui/status-pill"
import { CompanyCreateForm } from "@/features/organization/company-create-form"
import { useSession } from "@/features/auth/session-provider"
import { canManageOrganization } from "@/features/auth/access"
import { OrganizationAdminPanel } from "@/features/organization/organization-admin-panel"

export function OrganizationView() {
    const t = useTranslations("organization")
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
            <PageHeader
                eyebrow={t("eyebrow")}
                title={activeCompany?.company.name ?? t("fallbackTitle")}
                subtitle={t("subtitle")}
                status={
                    user?.is_developer ? (
                        <StatusPill tone="green">{t("developer")}</StatusPill>
                    ) : organizationContext?.membership ? (
                        <StatusPill tone="green">
                            {organizationContext.membership.role}
                        </StatusPill>
                    ) : null
                }
                className="mb-0"
            />
            {error ? (
                <div className="rounded-md bg-error-soft px-4 py-3 text-sm font-medium text-error-strong">
                    {error}
                </div>
            ) : null}

            <Card as="section" padding="lg">
                <h2 className="type-section mb-4">{t("createCompany.title")}</h2>
                <CompanyCreateForm />
            </Card>

            <OrganizationAdminPanel
                companyId={activeCompanyId}
                canManage={canManage}
                branches={organizationContext?.branches ?? []}
            />

            <section className="grid gap-6 xl:grid-cols-2">
                <Card padding="lg">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="type-section">{t("branches.title")}</h2>
                        <StatusPill tone="neutral">{organizationContext?.branches.length ?? 0}</StatusPill>
                    </div>

                    <div className="grid max-h-60 gap-2 overflow-y-auto pr-1">
                        {organizationContext?.branches.map((branch) => (
                            <div
                                key={branch.id}
                                className="flex items-center justify-between gap-3 rounded-md bg-surface-muted px-4 py-3"
                            >
                                <div>
                                    <p className="text-sm font-bold leading-tight text-ink">{branch.name}</p>
                                    <p className="mt-0.5 text-xs font-medium text-ink-muted">
                                        {branch.code ?? t("branches.noCode")}
                                    </p>
                                </div>
                                {branch.is_primary ? (
                                    <StatusPill tone="green">{t("branches.primary")}</StatusPill>
                                ) : null}
                            </div>
                        ))}
                        {(!organizationContext?.branches || organizationContext.branches.length === 0) && (
                            <EmptyState compact icon="corporate_fare" title={t("branches.empty")} />
                        )}
                    </div>

                    <form onSubmit={submitBranch} className="mt-6 grid gap-4 border-t border-line pt-6">
                        <h3 className="type-section text-sm">{t("branches.addTitle")}</h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field
                                label={t("branches.name")}
                                value={branchForm.name}
                                onChange={(event) =>
                                    setBranchForm((current) => ({ ...current, name: event.target.value }))
                                }
                                required
                            />
                            <Field
                                label={t("branches.code")}
                                value={branchForm.code}
                                onChange={(event) =>
                                    setBranchForm((current) => ({ ...current, code: event.target.value }))
                                }
                                placeholder="HQ"
                            />
                        </div>
                        <Button type="submit" variant="secondary" size="xl" className="w-full" disabled={!activeCompanyId || isLoading}>
                            {t("branches.submit")}
                        </Button>
                    </form>
                </Card>

                <Card padding="lg" className="flex flex-col">
                    <h2 className="type-section mb-4">{t("members.title")}</h2>
                    <form onSubmit={submitMembership} className="grid flex-1 gap-4">
                        <Field
                            label={t("members.userId")}
                            type="number"
                            min="1"
                            value={membershipForm.user_id}
                            onChange={(event) =>
                                setMembershipForm((current) => ({ ...current, user_id: event.target.value }))
                            }
                            required
                        />
                        <p className="-mt-2 text-xs font-medium text-ink-muted">
                            {t("members.userIdHint")}
                        </p>
                        <SearchableSelect
                            label={t("members.branch")}
                            value={membershipForm.branch_id}
                            onChange={(val) =>
                                setMembershipForm((current) => ({ ...current, branch_id: String(val) }))
                            }
                            options={organizationContext?.branches.map((branch) => ({
                                value: branch.id,
                                label: branch.name
                            })) || []}
                            placeholder={t("members.branchPlaceholder")}
                        />
                        <SelectField
                            label={t("members.role")}
                            value={membershipForm.role}
                            onChange={(event) =>
                                setMembershipForm((current) => ({ ...current, role: event.target.value }))
                            }
                        >
                            <option value="member">{t("members.roleMember")}</option>
                            <option value="admin">{t("members.roleAdmin")}</option>
                        </SelectField>
                        <div className="mt-auto pt-6">
                            <Button type="submit" variant="secondary" size="xl" className="w-full" disabled={!activeCompanyId || isLoading}>
                                {t("members.submit")}
                            </Button>
                        </div>
                    </form>
                </Card>
            </section>
        </div>
    )
}
