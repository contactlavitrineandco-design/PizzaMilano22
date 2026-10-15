"use client";

import { useState, type ReactNode } from "react";
import { eur } from "@/lib/format";
import { CATEGORIES } from "@/lib/menu";
import type { Category, Product, Supplement } from "@/lib/types";
import { Lightbox, type LightboxPhoto } from "./Lightbox";
import { ProductImage } from "./ProductImage";

interface Props {
  products: Product[];
  supplements: Supplement[];
  /** Bouton « Commander » (lien SumUp ou téléphone), rendu côté serveur. */
  orderButton: ReactNode;
  /** Contenu affiché sous la carte (galerie de la pizzeria). */
  children?: ReactNode;
}

/** Carte à consulter. La commande se fait sur la page SumUp du restaurant (ou par téléphone). */
export function Menu({ products, supplements, orderButton, children }: Props) {
  const [cat, setCat] = useState<Category>("tomate");
  const [photo, setPhoto] = useState<LightboxPhoto | null>(null);

  const supps = (category: Category) => supplements.filter((s) => s.available && s.applies_to.includes(category));
  const pizzaSupps = supps("tomate");
  const souffleSupps = supps("souffle");

  return (
    <>
      <div className="wrap shop menu-only">
        <div className="shop-main">
          <section aria-label="Carte" id="carte">
            <div className="tabs" role="group" aria-label="Rubriques de la carte">
              {CATEGORIES.map((c) => (
                <button key={c.id} type="button" aria-pressed={c.id === cat} onClick={() => setCat(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>

            {/* Toutes les rubriques sont dans la page (référencement) ; les onglets masquent les autres. */}
            {CATEGORIES.map((category) => {
              const items = products.filter((p) => p.category === category.id);
              const categoryHasPhoto = items.some((p) => p.image_path);
              return (
                <div key={category.id} hidden={category.id !== cat}>
                  <div className="sec-h">
                    <h2 className={category.cls}>{category.name}</h2>
                    <span>{category.sub}</span>
                  </div>
                  <div className="grid">
                    {items.map((p) => (
                      <article key={p.id} className={`item${p.available ? "" : " off"}`}>
                        <ProductImage product={p} onOpen={setPhoto} placeholder={categoryHasPhoto} />
                        {p.tag && p.available && <span className="tag">{p.tag}</span>}
                        {!p.available && <span className="tag">Victime de son succès</span>}
                        <h3>{p.name}</h3>
                        <p className="ing">{p.description}</p>
                        <div className="row">
                          <span className="price num">{eur(p.price)}</span>
                          {!p.available && <span className="soldout">Épuisé</span>}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}

            {(pizzaSupps.length > 0 || souffleSupps.length > 0) && (
              <div className="extras">
                {pizzaSupps.length > 0 && (
                  <>
                    <b>Suppléments pizza :</b>{" "}
                    {pizzaSupps.map((s) => `${s.name.toLowerCase()} +${eur(s.price)}`).join(" · ")}
                  </>
                )}
                {souffleSupps.length > 0 && (
                  <>
                    {pizzaSupps.length > 0 && " — "}
                    <b>Soufflés :</b> {souffleSupps.map((s) => `${s.name.toLowerCase()} +${eur(s.price)}`).join(" · ")}
                  </>
                )}
              </div>
            )}
            <div className="menu-order">{orderButton}</div>
          </section>
          {children}
        </div>
      </div>

      {/* Mobile : le bouton Commander reste toujours à portée de pouce */}
      <div className="mobile-bar">{orderButton}</div>

      <Lightbox photo={photo} onClose={() => setPhoto(null)} />
    </>
  );
}
