"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { ApiError } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { useSession } from "@/features/auth/session-provider"

export function ForgotPasswordForm() {
    const { forgotPassword } = useSession()
    const [email, setEmail] = useState("")
    const [pending, setPending] = useState(false)

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setPending(true)

        try {
            toast.success(await forgotPassword(email))
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Password reset failed.")
        } finally {
            setPending(false)
        }
    }

    return (
        <form onSubmit={submit} className="grid gap-5">
            <Field
                label="Email address"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
            />

            <Button type="submit" disabled={pending} className="w-full h-11 bg-teal-700 hover:bg-teal-900 text-white font-semibold rounded-lg">
                {pending ? "Sending link..." : "Send reset link"}
            </Button>

            <Link href="/login" className="text-center text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors">
                Back to login
            </Link>
        </form>
    )
}

export function ResetPasswordForm() {
    const { resetPassword } = useSession()
    const [form, setForm] = useState({
        email: "",
        token: "",
        password: "",
        password_confirmation: "",
    })
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null)
    const [pending, setPending] = useState(false)

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setPending(true)
        setFieldErrors(null)

        try {
            toast.success(await resetPassword(form))
        } catch (caught) {
            if (caught instanceof ApiError) {
                setFieldErrors(caught.errors ?? null)
            }
            toast.error(caught instanceof Error ? caught.message : "Password reset failed.")
        } finally {
            setPending(false)
        }
    }

    return (
        <form onSubmit={submit} className="grid gap-5">
            <Field
                label="Email address"
                type="email"
                value={form.email}
                error={fieldErrors?.email?.[0]}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
            />
            <Field
                label="Reset token"
                value={form.token}
                error={fieldErrors?.token?.[0]}
                onChange={(event) => setForm((current) => ({ ...current, token: event.target.value }))}
                required
            />
            <Field
                label="New password"
                type="password"
                value={form.password}
                error={fieldErrors?.password?.[0]}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required
            />
            <Field
                label="Confirm password"
                type="password"
                value={form.password_confirmation}
                error={fieldErrors?.password_confirmation?.[0]}
                onChange={(event) =>
                    setForm((current) => ({ ...current, password_confirmation: event.target.value }))
                }
                required
            />

            <Button type="submit" disabled={pending} className="w-full h-11 bg-teal-700 hover:bg-teal-900 text-white font-semibold rounded-lg">
                {pending ? "Resetting password..." : "Reset password"}
            </Button>

            <Link href="/login" className="text-center text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors">
                Back to login
            </Link>
        </form>
    )
}
