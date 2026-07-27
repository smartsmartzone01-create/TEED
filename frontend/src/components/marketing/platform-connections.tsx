import Image, { type StaticImageData } from "next/image";
import { getTranslations } from "next-intl/server";

import facebookIcon from "@/assets/marketing/platforms/facebook.svg";
import googleAdsIcon from "@/assets/marketing/platforms/google-ads.svg";
import instagramIcon from "@/assets/marketing/platforms/instagram.svg";
import tiktokIcon from "@/assets/marketing/platforms/tiktok.svg";
import xIcon from "@/assets/marketing/platforms/x.svg";
import youtubeIcon from "@/assets/marketing/platforms/youtube.svg";
import styles from "@/styles/marketing/platform-connections.module.css";

type Platform = {
  name: string;
  icon: StaticImageData;
};

const platforms: Platform[] = [
  {
    name: "Instagram",
    icon: instagramIcon,
  },
  {
    name: "Facebook",
    icon: facebookIcon,
  },
  {
    name: "X",
    icon: xIcon,
  },
  {
    name: "YouTube",
    icon: youtubeIcon,
  },
  {
    name: "Google Ads",
    icon: googleAdsIcon,
  },
  {
    name: "TikTok",
    icon: tiktokIcon,
  },
];

function PlatformGroup({
  hidden = false,
}: {
  hidden?: boolean;
}) {
  return (
    <ul
      aria-hidden={hidden || undefined}
      className={styles.group}
    >
      {platforms.map((platform) => (
        <li
          key={platform.name}
          className={styles.item}
        >
          <Image
            src={platform.icon}
            alt={hidden ? "" : platform.name}
            className="h-9 w-auto max-w-24 object-contain sm:h-11 sm:max-w-28"
          />

          <span className="text-sm font-medium text-foreground">
            {platform.name}
          </span>
        </li>
      ))}
    </ul>
  );
}

async function PlatformConnections() {
  const t = await getTranslations("PlatformConnections");

  return (
    <section
      aria-labelledby="platform-connections-title"
      className="overflow-hidden pt-4 sm:pt-6"
    >
      <div className="page-container text-center">
        <h2
          id="platform-connections-title"
          className="mx-auto text-2xl font-bold tracking-wide text-muted-foreground sm:text-lg"
        >
          {t("title")}
        </h2>
      </div>

      <div
        aria-label={t("platformsLabel")}
        className={`mt-8 border-y border-border/60 py-3 sm:py-4 ${styles.marquee}`}
      >
        <div className={styles.track}>
          <PlatformGroup />
          <PlatformGroup hidden />
        </div>
      </div>
    </section>
  );
}

export { PlatformConnections };