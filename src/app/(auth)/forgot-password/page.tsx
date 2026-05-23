import LogoCompact from "@/components/brands/logo-compact"
import { ForgotPasswordForm } from "@/features/auth/password-forms"

export default function ForgotPasswordPage() {
    return (
        <main className="flex min-h-dvh items-center justify-center bg-navy-50 p-6">
            <section className="w-full max-w-md rounded-2xl bg-white p-8 border border-navy-100/50">
                <div className="flex justify-center mb-6">
                    <div className="bg-yellow-500/15 p-4 rounded-full">
                        <LogoCompact className="h-6" />
                    </div>
                </div>

                <h1 className="text-2xl font-brand font-bold text-navy-900 text-center">
                    Forgot password
                </h1>
                <p className="mt-2 text-sm text-navy-500 font-body text-center">
                    Enter your email to receive a password reset link.
                </p>

                <div className="mt-6">
                    <ForgotPasswordForm />
                </div>
            </section>
        </main>
    )
}
