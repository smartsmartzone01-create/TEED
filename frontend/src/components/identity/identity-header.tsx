import { BrandMark } from "@/components/global/brand/brand-mark";
import { LanguageSwitcher } from "@/components/global/controls/language-switcher";
import { ThemeSwitcher } from "@/components/global/controls/theme-switcher";

import styles from "@/styles/identity/identity-header.module.css";

function IdentityHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <BrandMark className={styles.brand} tone="adaptive" />

        <div className={styles.controls}>
          <LanguageSwitcher contentClassName={styles.menu} />
          <ThemeSwitcher contentClassName={styles.menu} />
        </div>
      </div>
    </header>
  );
}

export { IdentityHeader };
