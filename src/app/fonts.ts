import localFont from "next/font/local";

/** Mêmes polices que la maquette, servies par le site (préchargées, sans décalage à l'affichage). */
export const alegreya = localFont({
  src: [
    { path: "./fonts/alegreya-latin-wght-normal.woff2", weight: "400 900", style: "normal" },
    { path: "./fonts/alegreya-latin-wght-italic.woff2", weight: "400 900", style: "italic" },
  ],
  variable: "--font-alegreya",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const figtree = localFont({
  src: "./fonts/figtree-latin-wght-normal.woff2",
  weight: "300 900",
  variable: "--font-figtree",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

export const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  variable: "--font-jetbrains",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "Menlo", "monospace"],
});
