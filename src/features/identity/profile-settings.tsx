"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Field, SelectField } from "@/components/ui/field"
import { StatusPill } from "@/components/ui/status-pill"
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
    const { data: profile, isLoading } = useIdentityProfile()
    const { updateCurrentProfile } = useSession()
    const updateProfile = useUpdateIdentityProfile()
    const userLookup = useIdentityUserLookup()
    const [message, setMessage] = useState<string | null>(null)
    const [form, setForm] = useState({
        display_name: "",
        avatar: "",
        locale: "en",
        timezone: "Asia/Jakarta",
    })
    const [lookupId, setLookupId] = useState("")

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
        setMessage(null)

        const updatedProfile = await updateProfile.mutateAsync({
            display_name: form.display_name.trim() || null,
            avatar: form.avatar.trim() || null,
            locale: form.locale || null,
            timezone: form.timezone || null,
        })

        updateCurrentProfile(updatedProfile)
        setMessage("Profile saved.")
    }

    async function lookup(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const userId = Number(lookupId)
        if (!Number.isInteger(userId) || userId <= 0) return

        await userLookup.mutateAsync(userId)
    }

    return (
        <div className="grid gap-6">
            <section className="rounded-2xl border border-navy-100 bg-white p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-teal-700 font-display">
                            Identity
                        </p>
                        <h1 className="mt-2 text-2xl font-brand font-bold text-navy-900">
                            Profile Settings
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-500">
                            Keep your workspace identity, locale, and timezone aligned with the API profile record.
                        </p>
                    </div>
                    <StatusPill tone={profile?.status.status === "active" ? "green" : "neutral"}>
                        {profile?.status.status ?? "loading"}
                    </StatusPill>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <form className="rounded-2xl border border-navy-100 bg-white p-6" onSubmit={submit}>
                    <h2 className="text-lg font-bold text-navy-900 font-display">Profile</h2>
                    <div className="mt-5 grid gap-4">
                        <Field
                            label="Display name"
                            value={form.display_name}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, display_name: event.target.value }))
                            }
                            disabled={isLoading}
                        />
                        <Field
                            label="Avatar URL"
                            value={form.avatar}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, avatar: event.target.value }))
                            }
                            placeholder="https://..."
                            disabled={isLoading}
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <SelectField
                                label="Locale"
                                value={form.locale}
                                onChange={(event) =>
                                    setForm((current) => ({ ...current, locale: event.target.value }))
                                }
                                disabled={isLoading}
                            >
                                <option value="en">English</option>
                                <option value="id">Indonesia</option>
                            </SelectField>
                            <SelectField
                                label="Timezone"
                                value={form.timezone}
                                onChange={(event) =>
                                    setForm((current) => ({ ...current, timezone: event.target.value }))
                                }
                                disabled={isLoading}
                            >
                                {timezoneOptions.map((timezone) => (
                                    <option key={timezone} value={timezone}>
                                        {timezone}
                                    </option>
                                ))}
                            </SelectField>
                        </div>
                        <Button type="submit" size="xl" disabled={updateProfile.isPending || isLoading}>
                            Save profile
                        </Button>
                        {message ? (
                            <p className="rounded-xl border border-emerald-250 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-850">
                                {message}
                            </p>
                        ) : null}
                    </div>
                </form>

                <form className="rounded-2xl border border-navy-100 bg-white p-6" onSubmit={lookup}>
                    <h2 className="text-lg font-bold text-navy-900 font-display">User Lookup</h2>
                    <p className="mt-1 text-xs leading-relaxed text-navy-500">
                        Resolve a user ID before adding members or assigning branch roles.
                    </p>
                    <div className="mt-5 grid gap-4">
                        <Field
                            label="User ID"
                            type="number"
                            min={1}
                            value={lookupId}
                            onChange={(event) => setLookupId(event.target.value)}
                        />
                        <Button type="submit" variant="secondary" size="xl" disabled={userLookup.isPending}>
                            Look up user
                        </Button>
                        {userLookup.data ? (
                            <div className="rounded-xl border border-navy-100 bg-navy-50/30 p-4">
                                <p className="text-sm font-bold text-navy-900">{userLookup.data.name}</p>
                                <p className="mt-1 text-xs font-medium text-navy-500">{userLookup.data.email}</p>
                            </div>
                        ) : null}
                        {userLookup.error ? (
                            <p className="rounded-xl border border-rose-250 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-850">
                                {userLookup.error.message}
                            </p>
                        ) : null}
                    </div>
                </form>
            </section>
        </div>
    )
}
