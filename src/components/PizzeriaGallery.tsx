"use client";

import Image from "next/image";
import { useState } from "react";
import { imageUrl } from "@/lib/images";
import type { GalleryPhoto, RestaurantSettings } from "@/lib/types";
import { Lightbox, type LightboxPhoto } from "./Lightbox";
import { MapEmbed } from "./MapEmbed";

/** Vraie photo de la devanture (publication Instagram du restaurant), pour reconnaître la pizzeria dans la rue. */
const STOREFRONT = {
  src: "/photos/etablissement/devanture.webp",
  alt: "Devanture de Pizza Milano au 3 rue du Maréchal Foch à Saint-Brieuc : façade en bois noir, enseigne lumineuse blanche PIZZA MILANO 22, porte ouverte et vitrine éclairée, rue pavée",
};

/**
 * « Découvrez notre pizzeria » : une présentation courte, la photo principale,
 * les autres photos éventuelles de la galerie, puis la carte pour venir.
 */
export function PizzeriaGallery({ photos, settings }: { photos: GalleryPhoto[]; settings: RestaurantSettings }) {
  const [open, setOpen] = useState<LightboxPhoto | null>(null);
  const [failed, setFailed] = useState<Set<string>>(new Set());

  const visible = photos.filter((p) => !failed.has(p.id));
  const [main, ...others] = visible;
  const hasAddress = settings.address && settings.postal_code && settings.city;
  const fullAddress = hasAddress ? `${settings.address}, ${settings.postal_code} ${settings.city}` : null;
  const mapQuery =
    settings.latitude != null && settings.longitude != null
      ? `${settings.latitude},${settings.longitude}`
      : fullAddress
        ? `${settings.restaurant_name}, ${fullAddress}`
        : null;
  const mapsUrl =
    settings.google_maps_url ??
    (mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : null);

  function openPhoto(p: GalleryPhoto) {
    setOpen({
      src: imageUrl(p.image_path),
      alt: p.alt,
      title: p.caption || settings.restaurant_name,
      illustration: p.source === "illustration",
    });
  }

  return (
    <section className="discover" aria-labelledby="discover-h">
      <div className="sec-h">
        <h2 id="discover-h">Découvrez notre pizzeria</h2>
      </div>

      <div className={`about${main ? "" : " about-solo"}`}>
        <div className="about-text">
          <p>
            Chez {settings.restaurant_name}
            {settings.address ? `, ${settings.address}` : ""}, les pizzas sortent du four bien dorées et généreusement
            garnies.
          </p>
          <p>
            Base tomate ou crème, de la Margherita toute simple à la Tartiflette bien fondante, en passant par la Cannibale
            pour les grosses faims, et nos soufflés servis avec leurs frites.
          </p>
          <p>Commandez en ligne, choisissez votre heure : votre commande vous attend au comptoir, toute chaude. Vous réglez sur place.</p>
          {(fullAddress || settings.phone) && (
            <ul className="about-facts">
              {fullAddress && <li>{fullAddress}</li>}
              {settings.phone && (
                <li>
                  <a href={`tel:+33${settings.phone.replace(/\s/g, "").slice(1)}`}>{settings.phone}</a>
                </li>
              )}
            </ul>
          )}
        </div>

        {main && (
          <figure className="about-photo">
            <button type="button" className="ph-open" aria-label={`Agrandir : ${main.caption || main.alt}`} onClick={() => openPhoto(main)}>
              <Image
                src={imageUrl(main.image_path)}
                alt={main.alt}
                fill
                sizes="(max-width: 720px) 92vw, 420px"
                onError={() => setFailed((f) => new Set(f).add(main.id))}
              />
            </button>
            {main.source === "illustration" && <span className="ph-badge ph-badge-top">Photo d&apos;illustration</span>}
            {main.caption && <figcaption className="ph-cap">{main.caption}</figcaption>}
          </figure>
        )}
      </div>

      {others.length > 0 && (
        <div className="photo-grid">
          {others.map((p) => (
            <figure className="ph-tile" key={p.id}>
              <button type="button" className="ph-open" aria-label={`Agrandir : ${p.caption || p.alt}`} onClick={() => openPhoto(p)}>
                <Image
                  src={imageUrl(p.image_path)}
                  alt={p.alt}
                  fill
                  sizes="(max-width: 720px) 46vw, (max-width: 980px) 30vw, 260px"
                  onError={() => setFailed((f) => new Set(f).add(p.id))}
                />
              </button>
              {p.source === "illustration" && <span className="ph-badge ph-badge-top">Photo d&apos;illustration</span>}
              {p.caption && <figcaption className="ph-cap">{p.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}

      {mapQuery && mapsUrl && (
        <div className="about-map" id="nous-trouver">
          <h3>Nous trouver</h3>
          <div className="find">
            <figure className="find-photo">
              <button
                type="button"
                className="ph-open"
                aria-label="Agrandir la photo de la devanture"
                onClick={() => setOpen({ src: STOREFRONT.src, alt: STOREFRONT.alt, title: "Notre devanture", illustration: false })}
              >
                <Image src={STOREFRONT.src} alt={STOREFRONT.alt} fill sizes="(max-width: 720px) 92vw, 380px" />
              </button>
            </figure>
            <div className="find-side">
              <p className="find-hint">
                Façade noire, enseigne lumineuse <b>PIZZA MILANO 22</b>
                {settings.address ? `, au ${settings.address}` : ""}.
              </p>
              <MapEmbed query={mapQuery} label={fullAddress ?? settings.restaurant_name} mapsUrl={mapsUrl} />
            </div>
          </div>
        </div>
      )}

      <Lightbox photo={open} onClose={() => setOpen(null)} />
    </section>
  );
}
