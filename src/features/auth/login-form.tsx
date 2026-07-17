"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { useSession } from "@/features/auth/session-provider"

export function LoginForm() {
    const router = useRouter()
    const t = useTranslations("auth.login")
    const { login, isLoading, error, fieldErrors, clearError } = useSession()
    const [form, setForm] = useState({ login: "", password: "" })

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        clearError()
        const loggedIn = await login(form)

        if (loggedIn) {
            router.push("/")
        }
    }

    return (
        <form onSubmit={submit} className="grid gap-5">
            {error ? (
                <div className="rounded-lg bg-error-soft px-4 py-3 text-sm font-medium text-error-strong">
                    {error}
                </div>
            ) : null}

            <Field
                label={t("loginField")}
                name="login"
                autoComplete="username"
                value={form.login}
                error={fieldErrors?.login?.[0]}
                onChange={(event) => setForm((current) => ({ ...current, login: event.target.value }))}
                required
            />

            <Field
                label={t("password")}
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                error={fieldErrors?.password?.[0]}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required
            />

            <div className="flex items-center justify-between">
                <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-brand-ink hover:text-brand-hover transition-colors"
                >
                    {t("forgotPassword")}
                </Link>
            </div>

            <Button type="submit" size="xl" disabled={isLoading} className="w-full">
                {isLoading ? t("submitting") : t("submit")}
            </Button>
        </form>
    )
}
