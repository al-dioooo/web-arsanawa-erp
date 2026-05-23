import { ResetPasswordForm } from "@/features/auth/password-forms"
import Logo from "@/components/brands/logo"

export default function ResetPasswordPage() {
    return (
        <main className="flex min-h-dvh items-center justify-center bg-navy-50 p-6">
            <section className="w-full max-w-md rounded-2xl bg-white p-8 border border-navy-100/50">
                <div className="flex justify-center mb-6">
                    <Logo color="teal" className="h-8 w-auto" />
                </div>

                <h1 className="text-2xl font-brand font-bold text-navy-900 text-center">
                    Reset password
                </h1>
                <p className="mt-2 text-sm text-navy-500 font-body text-center">
                    Enter your email, reset token, and your new password.
                </p>

                <div className="mt-6">
                    <ResetPasswordForm />
                </div>
            </section>
        </main>
    )
}
