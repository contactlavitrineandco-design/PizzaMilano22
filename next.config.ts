import type { NextConfig } from "next";

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

/** Seules les photos du bucket « photos » du projet Supabase peuvent être optimisées. */
function supabasePhotoPatterns(): { patterns: RemotePattern[]; local: boolean } {
  const patterns: RemotePattern[] = [
    { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/photos/**" },
  ];
  let local = false;
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (raw) {
    try {
      const u = new URL(raw);
      patterns.push({
        protocol: u.protocol.replace(":", "") as "http" | "https",
        hostname: u.hostname,
        port: u.port,
        pathname: "/storage/v1/object/public/photos/**",
      });
      // Supabase en local (npx supabase start) répond sur 127.0.0.1 :
      // l'optimiseur d'images refuse les IP locales par défaut.
      local = ["127.0.0.1", "localhost"].includes(u.hostname);
    } catch {
      // URL invalide : l'erreur sera signalée au premier appel Supabase
    }
  }
  return { patterns, local };
}

const { patterns, local } = supabasePhotoPatterns();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: patterns,
    dangerouslyAllowLocalIP: local,
    formats: ["image/webp"],
    qualities: [75],
    // Chaque nouvelle photo reçoit un nom unique : on peut garder le cache longtemps.
    minimumCacheTTL: 2678400,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // Politique de sécurité volontairement limitée aux règles sans risque pour Next.js :
          // pas d'intégration du site dans une autre page, pas de plugins, formulaires vers le site uniquement.
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
