import styles from "../../sketches/resource-sketch.module.css"

// A shared image reference keeps all three measurement diagrams consistent.
function MeasurementImageContours() {
  const thin = `${styles.line} ${styles.thin}`

  return (
    <g opacity=".28">
      <path className={thin} d="M80 113C88 103 85 91 97 78S119 59 131 48"
        data-a="draw" data-t=".2" data-d=".16" />
      <path className={thin} d="M108 113C112 101 113 89 126 77S147 61 155 48"
        data-a="draw" data-t=".24" data-d=".16" />
    </g>
  )
}

export { MeasurementImageContours }
