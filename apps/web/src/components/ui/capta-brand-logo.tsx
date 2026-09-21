import Image from "next/image"
import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

export type CaptaBrandLogoVariant =
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

const variantSrcMap: Record<CaptaBrandLogoVariant, string> = {
  original: "/brand/logo_black.svg",
  black: "/brand/logo_black.svg",
  blue: "/brand/logo_blue.svg",
  "blue-gradient": "/brand/logo_blue_gradient.svg",
  gold: "/brand/logo_gold.svg",
  "gold-gradient": "/brand/logo_gold_gradient.svg",
  white: "/brand/logo_white.svg",
  dark: "/brand/logo_black.svg",
  currentColor: "/brand/logo_currentColor.svg",
}

export function CaptaBrandLogo({
  variant = "black",
  width = 200,
  height = 50,
  className,
  alt = "CAPTAGOV",
  ...props
}: CaptaBrandLogoProps) {
  const src = variantSrcMap[variant] || variantSrcMap.original

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
