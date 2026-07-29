import type { ReactNode } from "react";

import { Card } from "@/components/global/primitives/card";
import { IdentityBackground } from "@/components/identity/identity-background";
import { IdentityHeader } from "@/components/identity/identity-header";

import styles from "@/styles/identity/identity-layout.module.css";

type IdentityLayoutProps = {
  children: ReactNode;
  description: ReactNode;
  eyebrow?: ReactNode;
  footer?: ReactNode;
  title: ReactNode;
};

function IdentityLayout({
  children,
  description,
  eyebrow,
  footer,
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
export type { IdentityLayoutProps };
