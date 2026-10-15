import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import { getSettings } from "@/lib/data";
import { DEFAULT_CITY, siteUrl } from "@/lib/site";
import { alegreya, figtree, jetbrainsMono } from "./fonts";
import "./globals.css";

const description = `Pizzeria à emporter à ${DEFAULT_CITY} : pizzas base tomate ou crème, soufflés et boissons fraîches. Commandez en ligne ou par téléphone, retirez au comptoir.`;

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
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Enseigne néon du chef pizzaïolo de Pizza Milano" }],
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#121010",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Le bouton « Commander » de l'en-tête suit le lien SumUp des réglages ; sans réglages, il est masqué.
  const settings = await getSettings().catch(() => null);
  return (
    <html lang="fr" className={`${alegreya.variable} ${figtree.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Header settings={settings} />
        {children}
      </body>
    </html>
  );
}
