"use client";

import Image from "next/image";
import { useState } from "react";
import { defaultProductAlt, imageUrl, isPizza } from "@/lib/images";
import type { Product } from "@/lib/types";
import type { LightboxPhoto } from "./Lightbox";
import { PizzaIllustration } from "./PizzaIllustration";

export const CARD_SIZES = "(max-width: 720px) 92vw, (max-width: 980px) 46vw, 300px";

/**
 * Photo d'un produit sur la carte, par ordre de priorité :
 * 1. la photo enregistrée (vraie photo, ou image marquée « Photo d'illustration ») ;
 * 2. pour une pizza, l'illustration dessinée d'après ses ingrédients (mention « Illustration ») ;
 * 3. sinon un panneau neutre si d'autres produits de la rubrique ont une photo (cartes de même hauteur),
 *    ou rien (la carte reste en texte, comme avant).
 * Si la photo ne se charge pas, on bascule automatiquement sur 2 ou 3.
 */
export function ProductImage({
  product,
  onOpen,
  placeholder = false,
}: {
  product: Product;
  onOpen: (photo: LightboxPhoto) => void;
  /** Afficher un panneau neutre si le produit n'a pas d'image (rubrique où d'autres produits en ont une). */
  placeholder?: boolean;
}) {
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const path = product.image_path && product.image_path !== failedPath ? product.image_path : null;

  if (path) {
    const src = imageUrl(path);
    const alt = product.image_alt || defaultProductAlt(product);
    const illustration = product.image_source === "illustration";
    return (
      <button
        type="button"
        className="item-photo"
        aria-label={`Agrandir la photo : ${product.name}`}
        onClick={() => onOpen({ src, alt, title: product.name, caption: product.description, illustration })}
      >
        <Image src={src} alt={alt} fill sizes={CARD_SIZES} onError={() => setFailedPath(path)} />
        {illustration && <span className="ph-badge">Photo d&apos;illustration</span>}
      </button>
    );
  }

  if (isPizza(product)) {
    return (
      <div className="item-photo">
        <PizzaIllustration name={product.name} description={product.description} category={product.category} />
        <span className="ph-badge">Illustration</span>
      </div>
    );
  }

  if (placeholder) {
    return (
      <div className="item-photo ph-plain" aria-hidden="true" />
    );
  }

  return null;
}
