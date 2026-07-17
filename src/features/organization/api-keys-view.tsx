"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Field } from "@/components/ui/field"
import { Icon } from "@/components/ui/icon"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusPill } from "@/components/ui/status-pill"
import { canManageOrganization } from "@/features/auth/access"
import { useSession } from "@/features/auth/session-provider"
import {
    type ExternalApiKey,
    useCreateExternalApiKey,
    useExternalApiKeys,
    useRevokeExternalApiKey,
    useRotateExternalApiKey,
} from "@/features/organization/organization-api"
import { compactDateTime } from "@/lib/format"

type SecretState = {
    label: string
    value: string
}

export function ApiKeysView() {
    const t = useTranslations("organization.apiKeys")
    const orgT = useTranslations("organization")
    const { activeCompanyId, organizationContext, user } = useSession()
    const canManage = canManageOrganization(organizationContext?.membership, user)
    const apiKeys = useExternalApiKeys(activeCompanyId)
    const createKey = useCreateExternalApiKey(activeCompanyId)
    const rotateKey = useRotateExternalApiKey(activeCompanyId)
    const revokeKey = useRevokeExternalApiKey(activeCompanyId)

    const [form, setForm] = useState({
        name: "",
        source_channel: "Landing Page",
        expires_at: "",
    })
    const [secret, setSecret] = useState<SecretState | null>(null)

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        try {
            const result = await createKey.mutateAsync({
                name: form.name,
                source_channel: form.source_channel,
                expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
            })

            setSecret({ label: result.api_key.name, value: result.plain_text_key })
            setForm({ name: "", source_channel: "Landing Page", expires_at: "" })
            toast.success(t("created"))
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : t("createError"))
        }
    }

    async function rotate(apiKey: ExternalApiKey) {
        try {
            const result = await rotateKey.mutateAsync(apiKey.id)
            setSecret({ label: result.api_key.name, value: result.plain_text_key })
            toast.success(t("rotated"))
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : t("rotateError"))
        }
    }

    async function revoke(apiKey: ExternalApiKey) {
        try {
            await revokeKey.mutateAsync(apiKey.id)
            if (secret?.label === apiKey.name) {
                setSecret(null)
            }
            toast.success(t("revoked"))
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : t("revokeError"))
        }
    }

    if (!activeCompanyId || !organizationContext?.company) {
        return (
            <div className="grid gap-6">
                <PageHeader eyebrow={orgT("eyebrow")} title={t("title")} className="mb-0" />
                <Card as="section" padding="lg">
                    <EmptyState icon="key" title={t("title")} description={t("selectOrganization")} />
                </Card>
            </div>
        )
    }

    if (!canManage) {
        return (
            <div className="grid gap-6">
                <PageHeader eyebrow={orgT("eyebrow")} title={t("title")} className="mb-0" />
                <Card as="section" padding="lg">
                    <EmptyState icon="lock" title={t("title")} description={t("cannotManage")} />
                </Card>
            </div>
        )
    }

    return (
        <div className="grid gap-6">
            <PageHeader
                eyebrow={orgT("eyebrow")}
                title={t("title")}
                subtitle={t("subtitle")}
                status={<StatusPill tone="green">{organizationContext.company.name}</StatusPill>}
                className="mb-0"
            />

            {secret ? (
                <Card as="section" padding="lg" className="bg-warning-soft">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm font-bold text-ink">
                                {t("secretTitle", { name: secret.label })}
                            </p>
                            <p className="mt-1 text-xs text-ink-muted">{t("secretHint")}</p>
                        </div>
                        <code className="break-all rounded-md bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-card">
                            {secret.value}
                        </code>
                    </div>
                </Card>
            ) : null}

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
                <Card padding="lg">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="type-section">{t("activeKeys")}</h2>
                        <StatusPill tone="neutral">{apiKeys.data?.length ?? 0}</StatusPill>
                    </div>

                    <div className="grid gap-3">
                        {apiKeys.isLoading ? (
                            <div className="grid gap-3" aria-hidden="true">
                                {Array.from({ length: 3 }).map((_, row) => (
                                    <Skeleton key={row} className="h-24 rounded-md" />
                                ))}
                            </div>
                        ) : apiKeys.data && apiKeys.data.length > 0 ? (
                            apiKeys.data.map((apiKey) => (
                                <ApiKeyRow
                                    key={apiKey.id}
                                    apiKey={apiKey}
                                    onRotate={() => rotate(apiKey)}
                                    onRevoke={() => revoke(apiKey)}
                                    isBusy={rotateKey.isPending || revokeKey.isPending}
                                />
                            ))
                        ) : (
                            <EmptyState compact icon="key" title={t("empty")} />
                        )}
                    </div>
                </Card>

                <Card as="form" padding="lg" onSubmit={submit}>
                    <h2 className="type-section">{t("createTitle")}</h2>
                    <div className="mt-4 grid gap-4">
                        <Field
                            label={t("name")}
                            value={form.name}
                            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                            placeholder="SEKALORI Landing Page"
                            required
                        />
                        <Field
                            label={t("sourceChannel")}
                            value={form.source_channel}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, source_channel: event.target.value }))
                            }
                            required
                        />
                        <Field
                            label={t("expiresAt")}
                            type="datetime-local"
                            value={form.expires_at}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, expires_at: event.target.value }))
                            }
                        />
                    </div>
                    <Button
                        type="submit"
                        size="xl"
                        className="mt-6 w-full"
                        disabled={createKey.isPending}
                    >
                        {t("submit")}
                    </Button>
                </Card>
            </section>
        </div>
    )
}

function ApiKeyRow({
    apiKey,
    onRotate,
    onRevoke,
    isBusy,
}: {
    apiKey: ExternalApiKey
    onRotate: () => void
    onRevoke: () => void
    isBusy: boolean
}) {
    const t = useTranslations("organization.apiKeys")

    return (
        <Card as="article" inset padding="sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-ink">{apiKey.name}</h3>
                        <StatusPill tone={apiKey.revoked ? "neutral" : "green"}>
                            {apiKey.revoked ? t("statusRevoked") : t("statusActive")}
                        </StatusPill>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-ink-muted">
                        <span>
                            {t("prefix")}:{" "}
                            <strong className="font-semibold text-ink-secondary">{apiKey.token_prefix}</strong>
                        </span>
                        <span>{t("source")}: {apiKey.source_channel}</span>
                        <span>{t("expires")}: {compactDateTime(apiKey.expires_at)}</span>
                        <span>{t("lastUsed")}: {compactDateTime(apiKey.last_used_at)}</span>
                    </div>
                </div>
                <div className="flex shrink-0 gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onRotate}
                        disabled={isBusy || apiKey.revoked}
                        aria-label={t("rotateAria", { name: apiKey.name })}
                    >
                        <Icon name="restart_alt" className="text-base" />
                        {t("rotate")}
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={onRevoke}
                        disabled={isBusy || apiKey.revoked}
                        aria-label={t("revokeAria", { name: apiKey.name })}
                    >
                        <Icon name="delete" className="text-base" />
                        {t("revoke")}
                    </Button>
                </div>
            </div>
        </Card>
    )
}
