import Image from "next/image"

function CaseImageLandmarksMethodArt() {
  return <span aria-hidden="true" className="relative flex h-36 w-full shrink-0 items-center justify-center overflow-hidden border-b border-border bg-muted/65 p-2.5 sm:h-40">
    <svg viewBox="0 0 216 112" preserveAspectRatio="none" focusable="false" fill="none" className="absolute inset-0 h-full w-full text-border">
      <g stroke="currentColor" strokeLinecap="round">
        <path d="M25 32V20h12m142 0h12v12m0 48v12h-12m-142 0H25V80" />
        <path d="M46 31h22m-22 8h13m-13 8h17M146 96h22m-22-8h13" opacity=".75" />
      </g>
    </svg>
    <Image src="/images/cases/tibia-tpa-card.svg" alt="" width={412} height={992} unoptimized
      className="relative h-full w-auto object-contain" />
  </span>
}

export { CaseImageLandmarksMethodArt }
