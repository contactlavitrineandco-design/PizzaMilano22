"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  const pro = pathname.startsWith("/pizzeria") || pathname.startsWith("/login");
  return (
    <header className="top">
      <div className="wrap">
        <Link href="/" className="brand">
          <span className="flag">
            <i />
            <i />
            <i />
          </span>
          <span>
            Pizza Milano<small>Pizzeria · À emporter</small>
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
