function getCaseWorkspaceHref(caseId: string): string {
  return `/app/cases/${encodeURIComponent(caseId)}/plan`
}

export { getCaseWorkspaceHref }
