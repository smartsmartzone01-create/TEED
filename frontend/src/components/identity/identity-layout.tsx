import type { ReactNode } from "react";

import { Card } from "@/components/global/primitives/card";
import { IdentityBackground } from "@/components/identity/identity-background";
import { IdentityHeader } from "@/components/identity/identity-header";

import styles from "@/styles/identity/identity-layout.module.css";

type IdentityIntroductionVariant = "default" | "compact";

type IdentityLayoutProps = {
  children: ReactNode;
  description: ReactNode;
  eyebrow?: ReactNode;
  footer?: ReactNode;
  introductionVariant?: IdentityIntroductionVariant;
  notice?: ReactNode;
  steps?: readonly string[];
  title: ReactNode;
};

function IdentityLayout({
  children,
  description,
  eyebrow,
  footer,
  introductionVariant = "default",
  notice,
  steps,
  title,
}: IdentityLayoutProps) {
  return (
    <div className={styles.shell}>
      <IdentityBackground />
      <IdentityHeader />

      <main className={styles.main}>
        <section
          aria-labelledby="identity-introduction-title"
          className={styles.introduction}
          data-variant={introductionVariant}
        >
          {eyebrow ? (
            <p className={styles.eyebrow}>{eyebrow}</p>
          ) : null}

          <h1
            className={styles.title}
            id="identity-introduction-title"
          >
            {title}
          </h1>

          <p className={styles.description}>{description}</p>

          {notice ? (
            <div className={styles.notice}>
              <span aria-hidden="true" className={styles.noticeMark}>
                ✓
              </span>
              <p className={styles.noticeText}>{notice}</p>
            </div>
          ) : null}

          {steps?.length ? (
            <ul className={styles.steps}>
              {steps.map((step) => (
                <li className={styles.step} key={step}>
                  <span aria-hidden="true" className={styles.stepMark}>
                    ✓
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <div className={styles.formColumn}>
          <Card className={styles.card}>{children}</Card>
          {footer ? (
            <div className={styles.footer}>{footer}</div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export { IdentityLayout };
export type {
  IdentityIntroductionVariant,
  IdentityLayoutProps,
};
