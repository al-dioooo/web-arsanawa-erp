"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { PageHeader } from "@/components/ui/page-header"
import { SelectDescription } from "@/components/ui/select-description"
import { useSession } from "@/features/auth/session-provider"
import {
    useIdentityProfile,
    useIdentityUserLookup,
    useUpdateIdentityProfile,
} from "@/features/identity/identity-api"

const timezoneOptions = [
    "Asia/Jakarta",
    "Asia/Makassar",
    "Asia/Jayapura",
    "UTC",
]

export function ProfileSettings() {
    const t = useTranslations("identity")
    const { data: profile, isLoading } = useIdentityProfile()
    const { updateCurrentProfile } = useSession()
    const updateProfile = useUpdateIdentityProfile()
    const userLookup = useIdentityUserLookup()
    const [form, setForm] = useState({
        display_name: "",
        avatar: "",
        locale: "en",
        timezone: "Asia/Jakarta",
    })
    const [lookupId, setLookupId] = useState("")

    const localeSelectOptions = useMemo(
        () => [
            {
                value: "en",
                label: t("localeEnglish"),
                description: t("localeEnglishDescription"),
            },
            {
                value: "id",
                label: t("localeIndonesian"),
                description: t("localeIndonesianDescription"),
            },
        ],
        [t],
    )

    const timezoneSelectOptions = useMemo(
        () =>
            timezoneOptions.map((timezone) => ({
                value: timezone,
                label: timezone,
                description:
                    timezone === "UTC"
                        ? t("timezoneUtcDescription")
                        : t("timezoneDescription", { timezone }),
            })),
        [t],
    )

    useEffect(() => {
        if (userLookup.error) {
            toast.error(userLookup.error.message)
        }
    }, [userLookup.error])

    useEffect(() => {
        if (!profile) return

        let active = true
        void Promise.resolve().then(() => {
            if (!active) return

            setForm({
                display_name: profile.profile.display_name ?? "",
                avatar: profile.profile.avatar ?? "",
                locale: profile.profile.locale ?? "en",
                timezone: profile.profile.timezone ?? "Asia/Jakarta",
            })
        })
        return () => {
            active = false
        }
    }, [profile])

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const updatedProfile = await updateProfile.mutateAsync({
            display_name: form.display_name.trim() || null,
            avatar: form.avatar.trim() || null,
            locale: form.locale || null,
            timezone: form.timezone || null,
        })

        updateCurrentProfile(updatedProfile)
        toast.success(t("saved"))
    }

    async function lookup(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const userId = Number(lookupId)
        if (!Number.isInteger(userId) || userId <= 0) return

        await userLookup.mutateAsync(userId)
    }

    return (
        <div className="grid gap-6">
            <PageHeader
                eyebrow={t("eyebrow")}
                title={t("title")}
                subtitle={t("subtitle")}
                className="mb-0"
            />

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <Card as="form" padding="lg" onSubmit={submit}>
                    <h2 className="type-section">{t("profileTitle")}</h2>
                    <div className="mt-5 grid gap-4">
                        <Field
                            label={t("displayName")}
                            value={form.display_name}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, display_name: event.target.value }))
                            }
                            disabled={isLoading}
                        />
                        <Field
                            label={t("avatarUrl")}
                            value={form.avatar}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, avatar: event.target.value }))
                            }
                            placeholder="https://..."
                            disabled={isLoading}
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <SelectDescription
                                label={t("locale")}
                                value={form.locale}
                                onChange={(event) =>
                                    setForm((current) => ({ ...current, locale: event.target.value }))
                                }
                                disabled={isLoading}
                                options={localeSelectOptions}
                            />
                            <SelectDescription
                                label={t("timezone")}
                                value={form.timezone}
                                onChange={(event) =>
                                    setForm((current) => ({ ...current, timezone: event.target.value }))
                                }
                                disabled={isLoading}
                                options={timezoneSelectOptions}
                            />
                        </div>
                        <Button type="submit" size="xl" disabled={updateProfile.isPending || isLoading}>
                            {t("save")}
                        </Button>
                    </div>
                </Card>

                <Card as="form" padding="lg" onSubmit={lookup}>
                    <h2 className="type-section">{t("lookupTitle")}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                        {t("lookupDescription")}
                    </p>
                    <div className="mt-5 grid gap-4">
                        <Field
                            label={t("userId")}
                            type="number"
                            min={1}
                            value={lookupId}
                            onChange={(event) => setLookupId(event.target.value)}
                        />
                        <Button type="submit" variant="secondary" size="xl" disabled={userLookup.isPending}>
                            {t("lookupSubmit")}
                        </Button>
                        {userLookup.data ? (
                            <div className="rounded-md bg-surface-muted p-4">
                                <p className="text-sm font-bold text-ink">{userLookup.data.name}</p>
                                <p className="mt-1 text-xs font-medium text-ink-muted">{userLookup.data.email}</p>
                            </div>
                        ) : null}
                    </div>
                </Card>
            </section>
        </div>
    )
}
