import { ChevronRight, Play } from "lucide-react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { orthovetPublicLinks } from "@/lib/orthovet-public-links"
import { SocialChannelIcon } from "@/components/ui/social-channel-icon"

import { HomeCommunityBrowser } from "./home-community-browser"
import styles from "./home-page.module.css"

function HomeSpotlightBanners() {
  const t = useTranslations("home")

  return (
    <section aria-label={t("spotlightLabel")} className={styles.spotlight} data-home-spotlight>
      <article aria-labelledby="home-presentation-title" className={styles.presentation} data-home-banner>
        <Image
          alt=""
          aria-hidden="true"
          className={styles.presentationTexture}
          draggable={false}
          height={724}
          priority
          sizes="(max-width: 1050px) 100vw, 70vw"
          src="/images/home/img_banner.avif"
          width={2171}
        />
        <div className={styles.presentationCopy}>
          <h2 className={styles.presentationTitle} data-home-banner-content id="home-presentation-title">
            {t("presentation.title")}
          </h2>
          <div className={styles.bannerFooter} data-home-banner-content>
            <button aria-label={`${t("presentation.watch")}. ${t("presentation.pending")}`} className={styles.presentationPending} disabled title={t("presentation.pending")} type="button">
              {t("presentation.watch")}
              <ChevronRight aria-hidden="true" size={19} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <div aria-label={t("presentation.previewLabel")} className={styles.videoPreview} data-home-preview role="img">
          <span aria-hidden="true" className={styles.videoPreviewGuide}>
            <span className={styles.videoPreviewLineTop} />
            <span className={styles.videoPreviewLineBottom} />
            <span className={styles.videoPreviewCornerTopLeft} />
            <span className={styles.videoPreviewCornerTopRight} />
            <span className={styles.videoPreviewCornerBottomLeft} />
            <span className={styles.videoPreviewCornerBottomRight} />
          </span>
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
                <a aria-label={t("community.channelLink", { channel: "Instagram" })} className={`${styles.communitySocialTab} ${styles.communitySocialInstagram}`} href={orthovetPublicLinks.instagram} target="_blank" rel="noopener noreferrer">
                  <span aria-hidden="true" className={styles.communitySocialName}>Instagram</span>
                  <SocialChannelIcon channel="instagram" className={styles.communitySocialIcon} size={18} />
                </a>
              </li>
              <li className={styles.communitySocial}>
                <a aria-label={t("community.channelLink", { channel: "LinkedIn" })} className={`${styles.communitySocialTab} ${styles.communitySocialLinkedin}`} href={orthovetPublicLinks.linkedin} target="_blank" rel="noopener noreferrer">
                  <span aria-hidden="true" className={styles.communitySocialName}>LinkedIn</span>
                  <SocialChannelIcon channel="linkedin" className={styles.communitySocialIcon} size={18} />
                </a>
              </li>
              <li className={styles.communitySocial}>
                <a aria-label={t("community.websiteLink")} className={`${styles.communitySocialTab} ${styles.communitySocialWebsite}`} href={orthovetPublicLinks.website} target="_blank" rel="noopener noreferrer">
                  <span aria-hidden="true" className={styles.communitySocialName}>Website</span>
                  <svg aria-hidden="true" className={styles.communitySocialIcon} fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
                    <circle cx="12" cy="12" r="9" />
                    <ellipse cx="12" cy="12" rx="4" ry="9" />
                    <path d="M3 12h18" />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </article>
    </section>
  )
}

export { HomeSpotlightBanners }
