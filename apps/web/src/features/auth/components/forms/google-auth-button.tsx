import Image from "next/image"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"

import { useGoogleAuth } from "../../hooks/use-google-auth"

function GoogleAuthButton() {
  const t = useTranslations("auth.shared")
  const { isSubmitting, signIn } = useGoogleAuth()

  return (
    <Button className="w-full" loading={isSubmitting} onClick={signIn} type="button" variant="secondary">
      <Image alt="" aria-hidden="true" className="size-5" height={20} src="/icons/google-g-logo.svg" width={20} />
      {t("continueWithGoogle")}
    </Button>
  )
}

export { GoogleAuthButton }
