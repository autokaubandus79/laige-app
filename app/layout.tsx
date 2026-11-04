import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Läige – koduse koristuse hind kohe",
  description: "Arvuta koristuse hind, vali sobiv aeg ja saada päring.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="et" className={`${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
