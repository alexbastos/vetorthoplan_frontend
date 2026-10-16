const casesQueryKeys = {
  all: ["cases"] as const,
  list: () => [...casesQueryKeys.all, "list"] as const,
  workspace: (caseId: string) => [...casesQueryKeys.all, "workspace", caseId] as const,
}

export { casesQueryKeys }
