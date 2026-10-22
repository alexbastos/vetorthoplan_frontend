"use client"

import { useGSAP } from "@gsap/react"
import { gsap } from "gsap"
import { useCallback, useEffect, useRef, useState } from "react"

import { FileUploadRow } from "./file-upload-row"
import type { FileUploadCardLabels, UploadCardFile } from "./file-upload-types"

gsap.registerPlugin(useGSAP)

type FileUploadListProps = {
  files: readonly UploadCardFile[]
  labels: FileUploadCardLabels
  locale: string
  disabled: boolean
  onFileRemove: (id: string) => void
  onFileRetry?: (id: string) => void
}

function FileUploadList({ files, labels, locale, disabled, onFileRemove, onFileRetry }: FileUploadListProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const previousPositions = useRef(new Map<string, number>())
  const [present, setPresent] = useState<readonly UploadCardFile[]>(files)
  const active = new Map(files.map((file) => [file.id, file]))
  const layoutKey = present.map((file) => `${file.id}:${active.get(file.id)?.status.state ?? "exiting"}`).join("|")

  useEffect(() => {
    setPresent((current) => {
      const existingIds = new Set(current.map((file) => file.id))
      const incoming = new Map(files.map((file) => [file.id, file]))
      const next = [...current.map((file) => incoming.get(file.id) ?? file), ...files.filter((file) => !existingIds.has(file.id))]
      return current.length === next.length && current.every((file, index) => file === next[index]) ? current : next
    })
  }, [files])

  useGSAP(() => {
    if (!listRef.current?.offsetParent) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const next = new Map<string, number>()
    for (const row of listRef.current?.querySelectorAll<HTMLLIElement>("[data-upload-row]") ?? []) {
      const id = row.dataset.uploadRow!
      const top = row.offsetTop
      const previous = previousPositions.current.get(id)
      if (!reduce && previous !== undefined && previous !== top) {
        gsap.fromTo(row, { y: previous - top }, { y: 0, duration: 0.25, ease: "power2.out", overwrite: "auto" })
      }
      next.set(id, top)
    }
    previousPositions.current = next
  }, { scope: listRef, dependencies: [layoutKey] })

  const finishExit = useCallback((id: string) => {
    setPresent((current) => current.filter((entry) => entry.id !== id))
  }, [])

  if (!present.length && !files.length) return null
  return (
    <div className="border-t border-border p-5 sm:p-6">
      <ul className="relative space-y-4" ref={listRef}>
        {present.map((entry) => (
          <li data-upload-row={entry.id} key={entry.id}>
            <FileUploadRow disabled={disabled} entry={active.get(entry.id) ?? entry} exiting={!active.has(entry.id)}
              labels={labels} locale={locale} onExit={finishExit} onRemove={onFileRemove} onRetry={onFileRetry} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export { FileUploadList }
