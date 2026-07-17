"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { ApiError } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { useSession } from "@/features/auth/session-provider"

export function ForgotPasswordForm() {
    const t = useTranslations("auth.forgot")
    const { forgotPassword } = useSession()
    const [email, setEmail] = useState("")
    const [pending, setPending] = useState(false)

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setPending(true)

        try {
            toast.success(await forgotPassword(email))
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : t("failed"))
        } finally {
            setPending(false)
        }
    }

    return (
        <form onSubmit={submit} className="grid gap-5">
            <Field
                label={t("email")}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
            />

            <Button type="submit" size="xl" disabled={pending} className="w-full">
                {pending ? t("submitting") : t("submit")}
            </Button>

            <Link
                href="/login"
                className="text-center text-xs font-semibold text-brand-ink hover:text-brand-hover transition-colors"
            >
                {t("backToLogin")}
            </Link>
        </form>
    )
}

export function ResetPasswordForm() {
    const t = useTranslations("auth.reset")
    const { resetPassword } = useSession()
    const [form, setForm] = useState({
        email: "",
        token: "",
        password: "",
        password_confirmation: "",
    })
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null)
    const [pending, setPending] = useState(false)
    const [linkPrefilled, setLinkPrefilled] = useState(false)

    // Prefill email/token from the emailed reset link so users don't copy the
    // long opaque token by hand.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const email = params.get("email")
        const token = params.get("token")
        if (email || token) {
            /* eslint-disable react-hooks/set-state-in-effect */
            setForm((current) => ({
                ...current,
                email: email ?? current.email,
                token: token ?? current.token,
            }))
            setLinkPrefilled(Boolean(token))
            /* eslint-enable react-hooks/set-state-in-effect */
        }
    }, [])

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setFieldErrors(null)

        if (form.password !== form.password_confirmation) {
            setFieldErrors({ password_confirmation: [t("passwordMismatch")] })
            return
        }

        setPending(true)

        try {
            toast.success(await resetPassword(form))
        } catch (caught) {
            if (caught instanceof ApiError) {
                setFieldErrors(caught.errors ?? null)
            }
            toast.error(caught instanceof Error ? caught.message : t("failed"))
        } finally {
            setPending(false)
        }
    }

    return (
        <form onSubmit={submit} className="grid gap-5">
            <Field
                label={t("email")}
                type="email"
                value={form.email}
                error={fieldErrors?.email?.[0]}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
            />
            <Field
                label={t("token")}
                value={form.token}
                error={fieldErrors?.token?.[0]}
                onChange={(event) => setForm((current) => ({ ...current, token: event.target.value }))}
                readOnly={linkPrefilled}
                required
            />
            <Field
                label={t("newPassword")}
                type="password"
                value={form.password}
                error={fieldErrors?.password?.[0]}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required
            />
            <Field
                label={t("confirmPassword")}
                type="password"
                value={form.password_confirmation}
                error={fieldErrors?.password_confirmation?.[0]}
                onChange={(event) =>
                    setForm((current) => ({ ...current, password_confirmation: event.target.value }))
                }
                required
            />

            <Button type="submit" size="xl" disabled={pending} className="w-full">
                {pending ? t("submitting") : t("submit")}
            </Button>

            <Link
                href="/login"
                className="text-center text-xs font-semibold text-brand-ink hover:text-brand-hover transition-colors"
            >
                {t("backToLogin")}
            </Link>
        </form>
    )
}
