"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  const pro = pathname.startsWith("/gerant");
  return (
    <header className="top">
      <div className="wrap">
        <Link href="/" className="brand" aria-label="Pizza Milano, accueil">
          {/* Logo du restaurant (compte Instagram @milanopizza22) */}
          <Image className="brand-logo" src="/brand/logo-192.png" alt="" width={44} height={44} priority />
          <span>
            <span className="sign">Pizza Milano</span>
            <small>Pizzeria · À emporter</small>
          </span>
        </Link>
        {pro ? (
          <nav className="top-nav" aria-label="Navigation">
            <Link href="/">Voir le site</Link>
          </nav>
        ) : (
          <nav className="top-nav" aria-label="Navigation principale">
            <Link href="/#carte">La carte</Link>
            <Link href="/commander#carte" className="top-cta">
              Commander
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
