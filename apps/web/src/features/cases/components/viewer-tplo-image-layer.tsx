"use client"

import { useEffect, useId, useRef, useState } from "react"

import { tploSvgMatrix, type ViewerTploSimulation } from "../lib/tplo-preview"

type TploTextureState = { owner: string; status: "loading" | "ready" | "error" }

function ViewerTploImageLayer({ url, widthPx, heightPx, filter, alt, imageKey, simulation, onLoad, onError, onTextureError, onTextureState, attempt = 0 }: {
  url: string; widthPx: number; heightPx: number; filter: string; alt: string; imageKey: string
  simulation?: ViewerTploSimulation | null; onLoad?: () => void; onError?: () => void; onTextureError?: () => void
  onTextureState: (state: TploTextureState | null) => void; attempt?: number
}) {
  const id = useId().replace(/:/g, ""), owner = JSON.stringify([imageKey, url, simulation?.id ?? null, attempt])
  const currentOwner = useRef<string | null>(owner)
  currentOwner.current = owner
  const [asset, setAsset] = useState<TploTextureState | null>(null)
  const status = asset?.owner === owner ? asset.status : "loading"
  useEffect(() => { currentOwner.current = owner; return () => { currentOwner.current = null } }, [owner])
  useEffect(() => { if (!simulation) setAsset(null) }, [simulation?.id])
  useEffect(() => { onTextureState(simulation ? { owner, status } : null) }, [owner, status, simulation?.id, onTextureState])
  const composed = Boolean(simulation && status === "ready")
  const polygon = simulation?.originPointsPx.map(point => `${point.x},${point.y}`).join(" ") ?? ""
  return <>
    <img alt={alt} className="size-full object-fill select-none" draggable={false} onError={onError} onLoad={onLoad}
      referrerPolicy="no-referrer" src={url} style={{ filter, opacity: composed ? 0 : undefined }} />
    {simulation ? <svg aria-hidden="true" data-tplo-texture={status} data-tplo-texture-source={simulation.source}
      className="pointer-events-none absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${widthPx} ${heightPx}`}>
      <defs>
        <image key={owner} id={`${id}-image`} href={url} x={0} y={0} width={widthPx} height={heightPx} preserveAspectRatio="none"
          onLoad={() => { if (currentOwner.current === owner) setAsset({ owner, status: "ready" }) }}
          onError={() => { if (currentOwner.current === owner) { setAsset({ owner, status: "error" }); onTextureError?.() } }} />
        <clipPath id={`${id}-clip`} clipPathUnits="userSpaceOnUse"><polygon points={polygon} /></clipPath>
        <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x={0} y={0} width={widthPx} height={heightPx} style={{ maskType: "luminance" }}>
          <rect x={0} y={0} width={widthPx} height={heightPx} fill="white" /><polygon points={polygon} fill="black" />
        </mask>
      </defs>
      {composed ? <g style={{ filter }} data-tplo-composition>
        <use href={`#${id}-image`} mask={`url(#${id}-mask)`} />
        <g transform={tploSvgMatrix(simulation.matrix)} data-tplo-fragment-transform>
          <use href={`#${id}-image`} clipPath={`url(#${id}-clip)`} />
        </g>
      </g> : null}
    </svg> : null}
  </>
}

export { ViewerTploImageLayer }
export type { TploTextureState }
