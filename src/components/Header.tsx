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
        <nav className="switch" aria-label="Changer d'espace">
          <Link href="/commander" aria-current={pro ? undefined : "page"}>
            Commander
          </Link>
          <Link href="/pizzeria" aria-current={pro ? "page" : undefined}>
            Espace pizzeria
          </Link>
        </nav>
      </div>
    </header>
  );
}
