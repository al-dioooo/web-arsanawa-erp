import { useTranslations } from "next-intl"
import Logo from "@/components/brands/logo"
import { FlowerDecoration, FlameDecoration } from "@/components/brands/decorations"
import { LoginForm } from "@/features/auth/login-form"

export default function LoginPage() {
    const t = useTranslations("auth.login")

    return (
        <main className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,580px)] xl:grid-cols-[1fr_640px] bg-canvas">
            {/* Visual panel branding — deliberate brand moment, fixed teal palette */}
            <section className="relative hidden lg:flex flex-col justify-between p-12 bg-teal-900 overflow-hidden select-none">
                {/* Abstract background shapes */}
                <div className="absolute inset-0 pointer-events-none opacity-20">
                    <FlowerDecoration
                        className="absolute -top-40 -left-40 scale-150 rotate-45 w-[800px] h-[800px] text-teal-800"
                    />
                    <FlameDecoration
                        className="absolute -bottom-48 -right-48 scale-110 w-[600px] h-[600px] text-orange-500"
                    />
                </div>

                {/* Top brand header */}
                <div className="relative z-10 flex items-center gap-3">
                    <Logo color="white" className="h-10 w-auto" />
                </div>

                {/* Center message */}
                <div className="relative z-10 max-w-lg mt-auto mb-16">
                    <span className="inline-block px-3 py-1 rounded-pill text-xs font-semibold bg-teal-700/50 text-teal-100 backdrop-blur-md">
                        {t("panel.badge")}
                    </span>
                    <h2 className="mt-4 font-brand text-4xl xl:text-5xl leading-tight text-white font-bold">
                        {t("panel.headline")}
                    </h2>
                    <p className="mt-4 text-teal-100 font-body text-sm leading-relaxed">
                        {t("panel.description")}
                    </p>
                </div>

                {/* Footer features */}
                <div className="relative z-10 grid grid-cols-3 gap-6 pt-8 border-t border-white/10 text-teal-100">
                    <div>
                        <p className="font-brand text-lg text-white">{t("panel.featureModularTitle")}</p>
                        <p className="mt-1 text-xs text-teal-200">{t("panel.featureModularDescription")}</p>
                    </div>
                    <div>
                        <p className="font-brand text-lg text-white">{t("panel.featureScopedTitle")}</p>
                        <p className="mt-1 text-xs text-teal-200">{t("panel.featureScopedDescription")}</p>
                    </div>
                    <div>
                        <p className="font-brand text-lg text-white">{t("panel.featureDurableTitle")}</p>
                        <p className="mt-1 text-xs text-teal-200">{t("panel.featureDurableDescription")}</p>
                    </div>
                </div>
            </section>

            {/* Login form panel */}
            <section className="flex flex-col justify-center items-center px-6 py-12 lg:px-16 xl:px-24 bg-surface">
                <div className="w-full max-w-sm flex flex-col">
                    {/* Logo visible on mobile/tablet */}
                    <div className="lg:hidden mb-8">
                        <Logo color="teal" className="h-8 w-auto dark:hidden" />
                        <Logo color="white" className="hidden h-8 w-auto dark:block" />
                    </div>

                    <header className="mb-8">
                        <h1 className="text-3xl font-brand font-bold text-ink tracking-tight">
                            {t("title")}
                        </h1>
                        <p className="mt-2 text-sm text-ink-muted font-body">
                            {t("subtitle")}
                        </p>
                    </header>

                    <LoginForm />
                </div>
            </section>
        </main>
    )
}
