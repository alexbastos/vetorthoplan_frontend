import { useEffect, useMemo } from "react"
import {
  BoxGeometry, BufferGeometry, Color, Float32BufferAttribute,
  Line, LineDashedMaterial, Vector3,
} from "three"

import { StackSdfLabel, type StackLabel } from "./stack-sdf-label"
import { stackMotion, type StackScenePalette } from "./stack-scene-config"

type StackExtrudedPlateProps = {
  width: number
  height: number
  palette: StackScenePalette
  label?: StackLabel
  labelId?: string
  onTextReady?: (id: string) => void
}

// The depth curve supplied in the reference: retain the first 20%, then fade.
function smoothFalloff(z: number, halfDepth: number) {
  const norm = Math.max(0, Math.min(1, ((halfDepth - z) / (2 * halfDepth) - 0.2) / 0.8))
  return 1 - norm * norm * (3 - 2 * norm)
}

function StackExtrudedPlate({ width, height, palette, label, labelId, onTextReady }: StackExtrudedPlateProps) {
  const resources = useMemo(() => {
    const halfWidth = width / 2
    const halfHeight = height / 2
    const halfDepth = stackMotion.depth / 2
    const box = new BoxGeometry(width, height, stackMotion.depth, 1, 1, 8)
    const positions = box.getAttribute("position")
    // Faces stay flush with the background; only the depth projections fade.
    const faceColor = new Color(palette.surface)
    const colors: number[] = []

    for (let index = 0; index < positions.count; index++) {
      colors.push(faceColor.r, faceColor.g, faceColor.b)
    }
    box.setAttribute("color", new Float32BufferAttribute(colors, 3))

    const corners = [
      [-halfWidth, halfHeight], [halfWidth, halfHeight],
      [halfWidth, -halfHeight], [-halfWidth, -halfHeight],
    ]
    const frontPoints = [...corners, corners[0]].map(([x, y]) => new Vector3(x, y, halfDepth + 0.5))
    const frontGeometry = new BufferGeometry().setFromPoints(frontPoints)
    const frontMaterial = new LineDashedMaterial({ color: palette.text, dashSize: 3, gapSize: 2.5, transparent: true, opacity: 0.45, toneMapped: false })
    const front = new Line(frontGeometry, frontMaterial)
    front.computeLineDistances()

    const wirePoints: Vector3[] = []
    const wireColors: number[] = []
    const bracketPoints: Vector3[] = []
    corners.forEach(([x, y]) => {
      // Subdivide along Z so the native line interpolates the cubic falloff,
      // rather than leaving a complete rear rectangle or a constant-opacity edge.
      for (let segment = 0; segment < 8; segment++) {
        const startZ = halfDepth - stackMotion.depth * segment / 8
        const endZ = halfDepth - stackMotion.depth * (segment + 1) / 8
        wirePoints.push(new Vector3(x, y, startZ), new Vector3(x, y, endZ))
        wireColors.push(1, 1, 1, smoothFalloff(startZ, halfDepth))
        wireColors.push(1, 1, 1, smoothFalloff(endZ, halfDepth))
      }
      bracketPoints.push(new Vector3(x, y, halfDepth + 1), new Vector3(x - Math.sign(x) * 10, y, halfDepth + 1))
      bracketPoints.push(new Vector3(x, y, halfDepth + 1), new Vector3(x, y - Math.sign(y) * 10, halfDepth + 1))
    })

    const wire = new BufferGeometry().setFromPoints(wirePoints)
    wire.setAttribute("color", new Float32BufferAttribute(wireColors, 4))

    return {
      box, front, frontGeometry, frontMaterial,
      wire,
      brackets: new BufferGeometry().setFromPoints(bracketPoints),
    }
  }, [width, height, palette])

  useEffect(() => () => {
    resources.box.dispose()
    resources.frontGeometry.dispose()
    resources.frontMaterial.dispose()
    resources.wire.dispose()
    resources.brackets.dispose()
  }, [resources])

  return (
    <group>
      <mesh geometry={resources.box}>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </mesh>
      <primitive object={resources.front} />
      <lineSegments geometry={resources.wire}>
        <lineBasicMaterial color={palette.text} vertexColors transparent opacity={0.14} depthWrite={false} toneMapped={false} />
      </lineSegments>
      <lineSegments geometry={resources.brackets}>
        <lineBasicMaterial color={palette.text} toneMapped={false} />
      </lineSegments>
      {label && labelId && onTextReady && (
        <StackSdfLabel id={labelId} width={width} height={height} label={label} palette={palette} onTextReady={onTextReady} />
      )}
    </group>
  )
}

export { StackExtrudedPlate }
