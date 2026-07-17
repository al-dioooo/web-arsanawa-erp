import { useTranslations } from "next-intl"
import { ResetPasswordForm } from "@/features/auth/password-forms"
import Logo from "@/components/brands/logo"

export default function ResetPasswordPage() {
    const t = useTranslations("auth.reset")

    return (
        <main className="flex min-h-dvh items-center justify-center bg-canvas p-6">
            <section className="w-full max-w-md rounded-lg bg-surface p-8 shadow-card">
                <div className="flex justify-center mb-6">
                    <Logo color="teal" className="h-8 w-auto dark:hidden" />
                    <Logo color="white" className="hidden h-8 w-auto dark:block" />
                </div>

                <h1 className="text-2xl font-brand font-bold text-ink text-center">
                    {t("title")}
                </h1>
                <p className="mt-2 text-sm text-ink-muted font-body text-center">
                    {t("subtitle")}
                </p>

                <div className="mt-6">
                    <ResetPasswordForm />
                </div>
            </section>
        </main>
    )
}
