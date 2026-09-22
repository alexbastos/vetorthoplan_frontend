import Image from "next/image"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"

import { useGoogleAuth } from "../../hooks/use-google-auth"

type GoogleAuthButtonProps = {
  size?: "md" | "lg"
}

function GoogleAuthButton({ size = "lg" }: GoogleAuthButtonProps) {
  const t = useTranslations("auth.shared")
  const { isSubmitting, signIn } = useGoogleAuth()
  const iconSize = size === "lg" ? 20 : 16

  return (
    <Button
      className="w-full"
      loading={isSubmitting}
      onClick={signIn}
      size={size}
      type="button"
      variant="pillOption"
    >
      <Image alt="" aria-hidden="true" className={size === "lg" ? "size-5" : "size-4"} height={iconSize} src="/icons/google-g-logo.svg" width={iconSize} />
      {t("continueWithGoogle")}
    </Button>
  )
}

export { GoogleAuthButton }
export type { GoogleAuthButtonProps }
