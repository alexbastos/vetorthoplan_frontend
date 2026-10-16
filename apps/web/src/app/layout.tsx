import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { getLocale, getMessages, getTimeZone, getTranslations } from "next-intl/server";
import "./globals.css";
import { getCanonicalUrl } from "@/lib/seo/public-routes";
import { Providers } from "./providers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.metadata")
  return {
    metadataBase: getCanonicalUrl("/"),
    title: { default: "CAPTAGOV", template: "%s | CAPTAGOV" },
    description: t("description"),
  }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, messages, timeZone] = await Promise.all([getLocale(), getMessages(), getTimeZone()]);

  return (
    <html
      lang={locale}
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers locale={locale} messages={messages} timeZone={timeZone}>{children}</Providers>
      </body>
    </html>
  );
}
