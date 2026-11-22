import { heroRadiograph } from "./hero-product-measurements"
import { heroAnnotationScale, heroTpaConstruction, heroTpaColors, heroTpaPoints } from "./hero-product-tpa"
import { HeroProductLiveAnnotations } from "./hero-product-live-annotations"
import styles from "./hero-product-workspace.module.css"

function HeroProductAnnotations({ final = false, locale }: { final?: boolean; locale: string }) {
  if (!final) return <HeroProductLiveAnnotations locale={locale} />
  const construction = heroTpaConstruction(4, undefined, heroAnnotationScale, locale)
  const pixel = 1 / heroAnnotationScale
  return (
    <svg aria-hidden="true" className={styles.annotations} data-hero-tpa-overlay="report" data-angle-locale={locale}
      preserveAspectRatio="xMidYMid meet" viewBox={`0 0 ${heroRadiograph.widthPx} ${heroRadiograph.heightPx}`}>
      {(["axis", "plateau", "reference"] as const).map(kind => {
        const line = construction.segments[kind]
        return <line data-tpa-segment={kind} key={kind}
          x1={(line?.start.x ?? 0) * heroRadiograph.widthPx} y1={(line?.start.y ?? 0) * heroRadiograph.heightPx}
          x2={(line?.end.x ?? 0) * heroRadiograph.widthPx} y2={(line?.end.y ?? 0) * heroRadiograph.heightPx}
          fill="none" stroke={kind === "reference" ? heroTpaColors.reference : heroTpaColors.line}
          strokeWidth={(kind === "reference" ? 1.5 : 2) * pixel} opacity={line?.visible ? 1 : 0} />
      })}
      <path data-tpa-arc d={construction.angle?.path ?? ""} fill="none" stroke={heroTpaColors.angle}
        strokeWidth={1.5 * pixel} strokeOpacity={0.72} opacity={construction.angle ? 1 : 0} />
      <text data-tpa-label x={construction.angle?.label?.x ?? 0} y={construction.angle?.label?.y ?? 0}
        fill={heroTpaColors.angle} fontFamily="var(--font-data), monospace" fontSize={11 * pixel}
        textAnchor="middle" dominantBaseline="middle" opacity={construction.angle?.label ? 1 : 0}>{construction.angle?.value ?? ""}</text>
      {construction.points.map((opacity, index) => <circle data-tpa-point={index} key={index}
        cx={heroTpaPoints[index].x * heroRadiograph.widthPx}
        cy={heroTpaPoints[index].y * heroRadiograph.heightPx} r={3 * pixel}
        fill={heroTpaColors.line} opacity={opacity} />)}
    </svg>
  )
}

export { HeroProductAnnotations }
