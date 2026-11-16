import { LockKeyhole, UserRound, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { Dialog } from "radix-ui"

import styles from "./community-safety-dialog.module.css"

function CommunitySafetyDialog() {
  const t = useTranslations("community.safetyNotice")
  const actions = useTranslations("common.actions")

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          className="rounded-sm text-[13px] font-medium text-foreground underline underline-offset-2 hover:text-content-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          type="button"
        >
          {t("learnMore")}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay}>
          <Dialog.Content className={styles.content}>
            <Dialog.Close
              aria-label={actions("close")}
              className="absolute top-3.5 right-3.5 z-10 grid size-8 place-items-center rounded-full text-content-secondary hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              type="button"
            >
              <X aria-hidden="true" size={17} />
            </Dialog.Close>

            <div aria-hidden="true" className={styles.artwork}>
              <div className={`${styles.bubble} ${styles.incoming}`}>
                <span className={styles.avatar}><UserRound size={14} /></span>
                <span className={styles.lines}><i /><i /><i /><i /></span>
              </div>
              <div className={`${styles.bubble} ${styles.outgoing}`}>
                <span className={styles.lines}><i /><i /><i /><i /></span>
                <span className={styles.avatar}><UserRound size={14} /></span>
              </div>
              <span className={styles.lock}><LockKeyhole size={24} strokeWidth={1.7} /></span>
            </div>

            <div className="relative px-6 pb-8 sm:px-10 sm:pb-9">
              <Dialog.Title className="text-xl leading-tight font-medium tracking-tight text-foreground sm:text-2xl">
                {t("dialogTitle")}
              </Dialog.Title>
              <Dialog.Description className="mt-3 text-[14px] leading-relaxed text-content-secondary sm:text-[15.5px]">
                {t("dialogDescription")}
              </Dialog.Description>
              <div className="mt-7 flex justify-end">
                <Dialog.Close
                  className="h-10 w-full rounded-full bg-inverse px-[22px] text-[14px] font-medium text-stage hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-auto"
                  type="button"
                >
                  {t("acknowledge")}
                </Dialog.Close>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export { CommunitySafetyDialog }
