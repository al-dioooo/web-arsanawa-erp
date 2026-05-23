"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { useSession } from "@/features/auth/session-provider"

export function LoginForm() {
    const router = useRouter()
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
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
                    {error}
                </div>
            ) : null}

            <Field
                label="Email or username"
                name="login"
                autoComplete="username"
                value={form.login}
                error={fieldErrors?.login?.[0]}
                onChange={(event) => setForm((current) => ({ ...current, login: event.target.value }))}
                required
            />

            <Field
                label="Password"
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
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors"
                >
                    Forgot password?
                </Link>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-11 bg-teal-700 hover:bg-teal-900 text-white font-semibold rounded-lg">
                {isLoading ? "Signing in..." : "Sign in"}
            </Button>
        </form>
    )
}
