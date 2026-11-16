function normalizeSearchText(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
}

export { normalizeSearchText }
