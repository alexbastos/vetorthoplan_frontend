const workflowRadiographs = {
  craniocaudal: {
    objectPosition: "center",
    src: "/images/landing/img_radio_craniocaudal.avif",
  },
  lateral: {
    objectPosition: "center",
    src: "/images/landing/img_radio_lateral.avif",
  },
  oblique: {
    objectPosition: "center",
    src: "/images/landing/img_radio_obliqua.avif",
  },
} as const

const workflowRadiographSequence = [
  workflowRadiographs.lateral,
  workflowRadiographs.craniocaudal,
  workflowRadiographs.oblique,
] as const

export { workflowRadiographs, workflowRadiographSequence }
