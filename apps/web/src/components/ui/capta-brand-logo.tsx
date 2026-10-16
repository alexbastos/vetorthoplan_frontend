import Image from "next/image"
import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

export type CaptaBrandLogoVariant =
  | "adaptive"
  | "original"
  | "blue"
  | "blue-gradient"
  | "gold"
  | "gold-gradient"
  | "white"
  | "black"
  | "dark"
  | "currentColor"

interface CaptaBrandLogoProps extends Omit<ComponentPropsWithoutRef<typeof Image>, "src" | "alt"> {
  variant?: CaptaBrandLogoVariant
  width?: number
  height?: number
  className?: string
  alt?: string
}

type StaticCaptaBrandLogoVariant = Exclude<CaptaBrandLogoVariant, "adaptive">

const variantSrcMap: Record<StaticCaptaBrandLogoVariant, string> = {
  original: "/brand/logo_vet_v2_black_spaced.svg",
  black: "/brand/logo_vet_v2_black_spaced.svg",
  blue: "/brand/logo_vet_v2_black_spaced.svg",
  "blue-gradient": "/brand/logo_vet_v2_black_spaced.svg",
  gold: "/brand/logo_vet_v2_black_spaced.svg",
  "gold-gradient": "/brand/logo_vet_v2_black_spaced.svg",
  white: "/brand/logo_vet_v2_white_spaced.svg",
  dark: "/brand/logo_vet_v2_white_spaced.svg",
  currentColor: "/brand/logo_vet_v2_black_spaced.svg",
}

export function CaptaBrandLogo({
  variant = "adaptive",
  width = 200,
  height = 50,
  className,
  alt = "Orthovet",
  ...props
}: CaptaBrandLogoProps) {
  if (variant === "adaptive") {
    return (
      <span className={cn("relative inline-block", className)}>
        <Image
          src="/brand/logo_vet_v2_black_spaced.svg"
          alt={alt}
          width={width}
          height={height}
          className="h-auto w-full object-contain dark:opacity-0"
          priority
          {...props}
        />
        <Image
          src="/brand/logo_vet_v2_white_spaced.svg"
          alt=""
          aria-hidden="true"
          width={width}
          height={height}
          className="absolute inset-0 h-auto w-full object-contain opacity-0 dark:opacity-100"
          priority
          {...props}
        />
      </span>
    )
  }

  const src = variantSrcMap[variant]

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn("h-auto w-auto object-contain", className)}
      priority
      {...props}
    />
  )
}
