import Link from "next/link";
import type { RestaurantSettings } from "@/lib/types";
import { OrderButton } from "./OrderButton";

export function Header({ settings }: { settings: Pick<RestaurantSettings, "order_url" | "phone"> | null }) {
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
        <nav className="top-nav" aria-label="Navigation principale">
          <Link href="/#carte">La carte</Link>
          {settings && <OrderButton settings={settings} className="top-cta" label="Commander" />}
        </nav>
      </div>
    </header>
  );
}
