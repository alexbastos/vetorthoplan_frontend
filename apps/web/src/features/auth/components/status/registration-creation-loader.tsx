import { OrthoVetLoader } from "@/components/ui/vetorthoplan-loader"
import { OrthoVetLoaderText } from "@/components/ui/orthovet-loader-text"
import { useTranslations } from "next-intl"

function RegistrationCreationLoader() {
  const t = useTranslations("auth.registration")
  return (
    <section
      aria-atomic="true"
      aria-busy="true"
      aria-live="polite"
      className="absolute inset-0 z-20 flex min-h-dvh flex-col items-center justify-center gap-4 bg-workspace px-6 text-center opacity-0 lg:min-h-0"
      data-auth-registration-loader
      role="status"
    >
      <OrthoVetLoader size={48} />
      <div className="relative h-5 w-56">
        <p className="absolute inset-0 flex items-center justify-center whitespace-nowrap" data-auth-registration-status-creating>
          <OrthoVetLoaderText>{t("creating")}</OrthoVetLoaderText>
        </p>
        <p className="absolute inset-0 flex items-center justify-center whitespace-nowrap opacity-0" data-auth-registration-status-sent>
          <OrthoVetLoaderText loading={false}>{t("sent")}</OrthoVetLoaderText>
        </p>
      </div>
    </section>
  )
}

export { RegistrationCreationLoader }
