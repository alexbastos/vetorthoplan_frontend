const MAX_IMAGE_NAME_LENGTH = 255

function splitImageName(name: string) {
  const dot = name.lastIndexOf(".")
  return dot > 0 ? { stem: name.slice(0, dot), extension: name.slice(dot) } : { stem: name, extension: "" }
}

function isValidImageName(name: string, originalName: string) {
  const { stem, extension } = splitImageName(name)
  return name.length <= MAX_IMAGE_NAME_LENGTH && stem.trim().length > 0
    && !/[\u0000-\u001f\u007f/\\]/.test(name)
    && extension.toLowerCase() === splitImageName(originalName).extension.toLowerCase()
}

function createImageCopyName(name: string, suffix: string, existingNames: readonly string[]) {
  const { stem, extension } = splitImageName(name)
  let number = 1
  while (true) {
    const label = ` (${suffix}${number > 1 ? ` ${number}` : ""})`
    const candidate = `${stem.slice(0, MAX_IMAGE_NAME_LENGTH - label.length - extension.length)}${label}${extension}`
    if (!existingNames.includes(candidate)) return candidate
    number += 1
  }
}

export { MAX_IMAGE_NAME_LENGTH, createImageCopyName, isValidImageName, splitImageName }
