import { Text } from "@react-three/drei/core/Text"
import { useLoader, useThree } from "@react-three/fiber"
import { useCallback, useEffect, useMemo } from "react"
import { BufferGeometry, SRGBColorSpace, TextureLoader, Vector3 } from "three"

import { stackMotion, type StackScenePalette } from "./stack-scene-config"

type StackLabel = {
  title: string
  description?: string
  source?: boolean
  initial?: boolean
  imageSrc?: string
}

type StackSdfLabelProps = {
  id: string
  width: number
  height: number
  label: StackLabel
  palette: StackScenePalette
  onTextReady: (id: string) => void
}

const fonts = {
  regular: "/fonts/architectural-stack/Geist-Regular.ttf",
  semibold: "/fonts/architectural-stack/Geist-SemiBold.ttf",
} as const

function SourceLogo({ src, width, height, onReady }: {
  src: string
  width: number
  height: number
  onReady: () => void
}) {
  const texture = useLoader(TextureLoader, src)
  const gl = useThree((state) => state.gl)
  const aspect = texture.image.width / texture.image.height
  const logoWidth = Math.min(width * 0.75, height * 0.75 * aspect)

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    texture.needsUpdate = true
    onReady()
  }, [texture, gl, onReady])

  return (
    <mesh position={[0, 0, stackMotion.depth / 2 + 0.5]}>
      <planeGeometry args={[logoWidth, logoWidth / aspect]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

function SourceStatus({ initial, palette }: { initial?: boolean; palette: StackScenePalette }) {
  // Geometric marks avoid requesting a fallback font for a checkmark glyph.
  const geometry = useMemo(() => new BufferGeometry().setFromPoints(
    (initial
      ? [[-7, 0], [-2, -5], [-2, -5], [7, 7]]
      : [[-6, 0], [6, 0], [0, -6], [0, 6]]
    ).map(([x, y]) => new Vector3(x, y, 0)),
  ), [initial])
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={initial ? palette.accent : palette.secondary} toneMapped={false} depthWrite={false} />
    </lineSegments>
  )
}

function StackSdfLabel({ id, width, height, label, palette, onTextReady }: StackSdfLabelProps) {
  const invalidate = useThree((state) => state.invalidate)
  const halfWidth = width / 2
  const halfHeight = height / 2
  const frontZ = stackMotion.depth / 2 + 0.5
  const handleTitleReady = useCallback(() => {
    onTextReady(`${id}:title`)
    invalidate()
  }, [id, onTextReady, invalidate])
  const handleDescriptionReady = useCallback(() => {
    onTextReady(`${id}:description`)
  }, [id, onTextReady])

  if (label.source) {
    return (
      <group>
        {label.imageSrc ? (
          <SourceLogo src={label.imageSrc} width={width} height={height} onReady={handleTitleReady} />
        ) : (
          <Text
            font={fonts.semibold}
            fontSize={26}
            fontWeight={600}
            sdfGlyphSize={64}
            color={palette.text}
            maxWidth={width - 16}
            overflowWrap="break-word"
            lineHeight={1.25}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            position={[0, 0, frontZ]}
            material-toneMapped={false}
            material-depthWrite={false}
            onSync={handleTitleReady}
          >
            {label.title}
          </Text>
        )}
        <group position={[halfWidth - 15, halfHeight - 15, frontZ + 0.5]}>
          <SourceStatus initial={label.initial} palette={palette} />
        </group>
      </group>
    )
  }

  return (
    <group>
      <Text
        font={fonts.regular}
        fontSize={36}
        fontWeight={400}
        sdfGlyphSize={64}
        color={palette.text}
        maxWidth={width - 96}
        letterSpacing={-0.005}
        anchorX="left"
        anchorY="middle"
        position={[-halfWidth + 48, 15, frontZ]}
        material-toneMapped={false}
        material-depthWrite={false}
        onSync={handleTitleReady}
      >
        {label.title}
      </Text>
      {label.description && (
        <Text
          font={fonts.regular}
          fontSize={20}
          sdfGlyphSize={64}
          color={palette.text}
          fillOpacity={0.6}
          maxWidth={width - 96}
          anchorX="left"
          anchorY="middle"
          position={[-halfWidth + 48, -24, frontZ]}
          material-toneMapped={false}
          material-depthWrite={false}
          onSync={handleDescriptionReady}
        >
          {label.description}
        </Text>
      )}
    </group>
  )
}

export { StackSdfLabel }
export type { StackLabel }
