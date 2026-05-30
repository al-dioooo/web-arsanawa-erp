"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Icon } from "@/components/ui/icon"
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
    const [error, setError] = useState<string | null>(null)

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)

        try {
            const result = await createKey.mutateAsync({
                name: form.name,
                source_channel: form.source_channel,
                expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
            })

            setSecret({ label: result.api_key.name, value: result.plain_text_key })
            setForm({ name: "", source_channel: "Landing Page", expires_at: "" })
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to create API key.")
        }
    }

    async function rotate(apiKey: ExternalApiKey) {
        setError(null)

        try {
            const result = await rotateKey.mutateAsync(apiKey.id)
            setSecret({ label: result.api_key.name, value: result.plain_text_key })
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to rotate API key.")
        }
    }

    async function revoke(apiKey: ExternalApiKey) {
        setError(null)

        try {
            await revokeKey.mutateAsync(apiKey.id)
            if (secret?.label === apiKey.name) {
                setSecret(null)
            }
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to revoke API key.")
        }
    }

    if (!activeCompanyId || !organizationContext?.company) {
        return (
            <section className="rounded-2xl border border-navy-100 bg-white p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-navy-100 text-navy-500">
                    <Icon name="key" className="text-2xl" />
                </div>
                <h1 className="mt-4 text-2xl font-brand font-bold text-navy-900">API Keys</h1>
                <p className="mt-2 text-sm text-navy-500">Select an organization before managing external access keys.</p>
            </section>
        )
    }

    if (!canManage) {
        return (
            <section className="rounded-2xl border border-navy-100 bg-white p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                    <Icon name="lock" className="text-2xl" />
                </div>
                <h1 className="mt-4 text-2xl font-brand font-bold text-navy-900">API Keys</h1>
                <p className="mt-2 text-sm text-navy-500">Your account cannot manage external API keys for this organization.</p>
            </section>
        )
    }

    return (
        <div className="grid gap-6">
            <section className="rounded-2xl border border-navy-100 bg-white p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-teal-700 font-display">
                            Organization
                        </p>
                        <h1 className="mt-2 text-2xl font-brand font-bold text-navy-900">API Keys</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-500 font-body">
                            Create and rotate company-scoped keys for landing pages and external integrations.
                        </p>
                    </div>
                    <StatusPill tone="green">{organizationContext.company.name}</StatusPill>
                </div>
                {error ? (
                    <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
                        {error}
                    </div>
                ) : null}
            </section>

            {secret ? (
                <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm font-bold text-navy-900">New secret for {secret.label}</p>
                            <p className="mt-1 text-xs text-navy-500">This value is shown once. Rotate the key if it is lost.</p>
                        </div>
                        <code className="break-all rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-navy-900">
                            {secret.value}
                        </code>
                    </div>
                </section>
            ) : null}

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
                <div className="rounded-2xl border border-navy-100 bg-white p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="text-lg font-bold text-navy-900 font-display">Active Keys</h2>
                        <StatusPill tone="neutral">{apiKeys.data?.length ?? 0}</StatusPill>
                    </div>

                    <div className="grid gap-3">
                        {apiKeys.isLoading ? (
                            <p className="py-6 text-center text-sm text-navy-500">Loading API keys...</p>
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
                            <p className="py-6 text-center text-sm text-navy-500">No API keys created yet.</p>
                        )}
                    </div>
                </div>

                <form onSubmit={submit} className="rounded-2xl border border-navy-100 bg-white p-6">
                    <h2 className="text-lg font-bold text-navy-900 font-display">Create Key</h2>
                    <div className="mt-4 grid gap-4">
                        <Field
                            label="Key name"
                            value={form.name}
                            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                            placeholder="SEKALORI Landing Page"
                            required
                        />
                        <Field
                            label="Source channel"
                            value={form.source_channel}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, source_channel: event.target.value }))
                            }
                            required
                        />
                        <Field
                            label="Expires at"
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
                        Create API Key
                    </Button>
                </form>
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
    return (
        <article className="rounded-xl border border-navy-100 bg-navy-50/20 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-navy-900">{apiKey.name}</h3>
                        <StatusPill tone={apiKey.revoked ? "neutral" : "green"}>
                            {apiKey.revoked ? "Revoked" : "Active"}
                        </StatusPill>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-navy-500">
                        <span>Prefix: <strong className="font-semibold text-navy-700">{apiKey.token_prefix}</strong></span>
                        <span>Source: {apiKey.source_channel}</span>
                        <span>Expires: {compactDateTime(apiKey.expires_at)}</span>
                        <span>Last used: {compactDateTime(apiKey.last_used_at)}</span>
                    </div>
                </div>
                <div className="flex shrink-0 gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onRotate}
                        disabled={isBusy || apiKey.revoked}
                        aria-label={`Rotate ${apiKey.name}`}
                    >
                        <Icon name="restart_alt" className="text-base" />
                        Rotate
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={onRevoke}
                        disabled={isBusy || apiKey.revoked}
                        aria-label={`Revoke ${apiKey.name}`}
                    >
                        <Icon name="delete" className="text-base" />
                        Revoke
                    </Button>
                </div>
            </div>
        </article>
    )
}
