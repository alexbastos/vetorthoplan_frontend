import { TriangleLoader } from "@/components/ui/triangle-loader"
import { useTranslations } from "next-intl"

function RegistrationCreationLoader() {
  const t = useTranslations("auth.registration")
  return (
    <section
      aria-atomic="true"
      aria-busy="true"
      aria-live="polite"
      className="absolute inset-0 z-20 flex min-h-dvh flex-col items-center justify-center gap-4 bg-capta-surface-card px-6 text-center opacity-0 lg:min-h-0"
      data-auth-registration-loader
      role="status"
    >
      <TriangleLoader size={48} />
      <div className="relative h-5 w-56 text-overline text-capta-text-secondary">
        <p className="absolute inset-0 flex items-center justify-center whitespace-nowrap" data-auth-registration-status-creating>
          {t("creating")}
          <span aria-hidden="true" className="inline-flex" data-auth-registration-dots>
            <span data-auth-registration-dot>.</span>
            <span data-auth-registration-dot>.</span>
            <span data-auth-registration-dot>.</span>
          </span>
        </p>
        <p className="absolute inset-0 flex items-center justify-center whitespace-nowrap opacity-0" data-auth-registration-status-sent>
          {t("sent")}
        </p>
      </div>
    </section>
  )
}

export { RegistrationCreationLoader }
