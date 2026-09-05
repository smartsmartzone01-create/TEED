import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Storefront Preview",
  description: "Externally hostable Tunakuza storefront runtime",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
