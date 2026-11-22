import Image from "next/image"

import type { CapabilityImage } from "./capabilities-content"
import styles from "./capabilities-accordion.module.css"

// Empty slots load no assets. Supplied AVIFs can retain their original encoding.
function CapabilityMedia({ image }: { image?: CapabilityImage }) {
  return (
    <div aria-hidden="true" className={styles.media} data-has-image={Boolean(image)}>
      {image ? <Image alt={image.alt} className={styles.image} fill
        sizes="(min-width: 1440px) 445px, (min-width: 768px) 40vw, 100vw" src={image.src} unoptimized={image.unoptimized} /> : null}
    </div>
  )
}

export { CapabilityMedia }
