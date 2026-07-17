import { useTranslations } from "next-intl"
import LogoCompact from "@/components/brands/logo-compact"
import { ForgotPasswordForm } from "@/features/auth/password-forms"

export default function ForgotPasswordPage() {
    const t = useTranslations("auth.forgot")

    return (
        <main className="flex min-h-dvh items-center justify-center bg-canvas p-6">
            <section className="w-full max-w-md rounded-lg bg-surface p-8 shadow-card">
                <div className="flex justify-center mb-6">
                    <div className="bg-brand-soft p-4 rounded-pill">
                        <LogoCompact className="h-6 dark:hidden" />
                        <LogoCompact color="white" className="hidden h-6 dark:block" />
                    </div>
                </div>

                <h1 className="text-2xl font-brand font-bold text-ink text-center">
                    {t("title")}
                </h1>
                <p className="mt-2 text-sm text-ink-muted font-body text-center">
                    {t("subtitle")}
                </p>

                <div className="mt-6">
                    <ForgotPasswordForm />
                </div>
            </section>
        </main>
    )
}
