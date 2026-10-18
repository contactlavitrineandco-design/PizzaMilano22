import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import { DEFAULT_CITY, siteUrl } from "@/lib/site";
import { alegreya, figtree, jetbrainsMono, jost } from "./fonts";
import "./globals.css";

const description = `Pizzeria à emporter à ${DEFAULT_CITY} : pizzas base tomate ou crème, soufflés et boissons fraîches. Commandez en ligne, retirez et payez au comptoir.`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `Pizza Milano · Pizzeria à emporter à ${DEFAULT_CITY}`,
    template: "%s · Pizza Milano",
  },
  description,
  applicationName: "Pizza Milano",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Pizza Milano",
    title: `Pizza Milano · Pizzeria à emporter à ${DEFAULT_CITY}`,
    description,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Devanture de Pizza Milano, 3 rue du Maréchal Foch à Saint-Brieuc : façade noire et enseigne lumineuse PIZZA MILANO 22" }],
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#161616",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${alegreya.variable} ${figtree.variable} ${jetbrainsMono.variable} ${jost.variable}`}>
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
