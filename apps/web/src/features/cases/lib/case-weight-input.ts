const WEIGHT_DRAFT_PATTERN = /^\d{0,5}(?:[.,]\d{0,2})?$/

function nextCaseWeightInputValue(previous: string, candidate: string): string {
  // Reject the entire edit, including pasted/dropped/autofilled text. A native
  // maxLength could truncate a paste into a different, valid clinical weight.
  if (WEIGHT_DRAFT_PATTERN.test(candidate)) return candidate
  // An older mounted draft may already be invalid. Let the user delete its
  // contents progressively; never require clearing the entire field to fix it.
  if (!WEIGHT_DRAFT_PATTERN.test(previous) && candidate.length < previous.length) {
    let prefix = 0
    while (prefix < candidate.length && candidate[prefix] === previous[prefix]) prefix++
    const removed = previous.length - candidate.length
    if (previous.slice(prefix + removed) === candidate.slice(prefix)) return candidate
  }
  return previous
}

export { nextCaseWeightInputValue }
