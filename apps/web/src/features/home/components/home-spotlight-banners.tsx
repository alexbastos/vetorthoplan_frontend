import { Play } from "lucide-react"
import Image from "next/image"
import { useTranslations } from "next-intl"

import { HomeDataTransition } from "./home-data-transition"
import { HomeCommunityBrowser } from "./home-community-browser"
import styles from "./home-page.module.css"

function HomeSpotlightBanners() {
  const t = useTranslations("home")

  return (
    <section aria-label={t("spotlightLabel")} className={styles.spotlight} data-home-spotlight>
      <article aria-labelledby="home-presentation-title" className={styles.presentation} data-home-banner>
        <div aria-hidden="true" className={styles.landscapeLayer}>
          <Image
            alt=""
            className={styles.landscapeImage}
            data-home-banner-image
            fill
            priority
            sizes="(max-width: 767px) 70vw, (max-width: 1199px) 40vw, 32vw"
            src="/images/home/img_paisagem_banner.avif"
          />
        </div>
        <HomeDataTransition />
        <div className={styles.presentationCopy}>
          <h2 className={styles.presentationTitle} data-home-banner-content id="home-presentation-title">
            {t("presentation.title")}
          </h2>
          <div className={styles.bannerFooter} data-home-banner-content>
            <button aria-label={`${t("presentation.watch")}. ${t("presentation.pending")}`} className={styles.presentationPending} disabled title={t("presentation.pending")} type="button">
              <Play aria-hidden="true" className="size-4 fill-current" />
              {t("presentation.watch")}
            </button>
            <span className={styles.presentationDuration}>{t("presentation.duration")}</span>
          </div>
        </div>

        <div aria-label={t("presentation.previewLabel")} className={styles.videoPreview} data-home-preview role="img">
          <div className={styles.videoPreviewImage}>
            <Image
              alt=""
              className={styles.thumbnailImage}
              fill
              priority
              sizes="(max-width: 767px) 46vw, (max-width: 1199px) 30vw, 340px"
              src="/images/home/img_miniatura_banner_home.avif"
              unoptimized
            />
            <span className={styles.videoPreviewPlay}><Play aria-hidden="true" className="size-5 fill-current" strokeWidth={1.6} /></span>
          </div>
        </div>
      </article>

      <article aria-labelledby="home-community-title" className={styles.community} data-home-banner>
        <div aria-hidden="true" className={styles.communityArtwork}>
          <HomeCommunityBrowser comment={[t("community.previewComment.firstLine"), t("community.previewComment.secondLine")]} />
        </div>
        <div className={styles.communityCopy}>
          <h2 className={styles.communityTitle} data-home-banner-content id="home-community-title">
            {t.rich("community.title", { br: () => <br /> })}
          </h2>
          <div className={styles.communityFooter} data-home-banner-content>
            <ul aria-label={t("community.socialLabel")} className={styles.communitySocials}>
              <li className={styles.communitySocial}>
                <button aria-disabled="true" aria-label={`Instagram. ${t("community.pending")}`} className={`${styles.communitySocialTab} ${styles.communitySocialInstagram}`} type="button">
                  <span aria-hidden="true" className={styles.communitySocialName}>Instagram</span>
                  <svg aria-hidden="true" className={styles.communitySocialIcon} fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
                    <rect height="18" rx="5" width="18" x="3" y="3" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" fill="currentColor" r="1" stroke="none" />
                  </svg>
                </button>
              </li>
              <li className={styles.communitySocial}>
                <button aria-disabled="true" aria-label={`LinkedIn. ${t("community.pending")}`} className={`${styles.communitySocialTab} ${styles.communitySocialLinkedin}`} type="button">
                  <span aria-hidden="true" className={styles.communitySocialName}>LinkedIn</span>
                  <svg aria-hidden="true" className={styles.communitySocialIcon} fill="currentColor" height="18" viewBox="0 0 24 24" width="18">
                    <circle cx="5" cy="6" r="1.4" />
                    <rect height="11" rx=".3" width="2.3" x="4" y="9" />
                    <path d="M10 9h2.2v1.5c.6-1.1 1.7-1.8 3.3-1.8 2.6 0 4 1.6 4 4.4V20h-2.4v-6.5c0-1.7-.6-2.5-2-2.5-1.5 0-2.3 1-2.3 2.8V20H10V9Z" />
                  </svg>
                </button>
              </li>
              <li className={styles.communitySocial}>
                <button aria-disabled="true" aria-label={`Website. ${t("community.pending")}`} className={`${styles.communitySocialTab} ${styles.communitySocialWebsite}`} type="button">
                  <span aria-hidden="true" className={styles.communitySocialName}>Website</span>
                  <svg aria-hidden="true" className={styles.communitySocialIcon} fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
                    <circle cx="12" cy="12" r="9" />
                    <ellipse cx="12" cy="12" rx="4" ry="9" />
                    <path d="M3 12h18" />
                  </svg>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </article>
    </section>
  )
}

export { HomeSpotlightBanners }
