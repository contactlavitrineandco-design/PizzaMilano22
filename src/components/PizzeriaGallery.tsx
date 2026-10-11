"use client";

import Image from "next/image";
import { useState } from "react";
import { GALLERY_SECTIONS, imageUrl } from "@/lib/images";
import type { GalleryPhoto, GallerySection } from "@/lib/types";
import { Lightbox, type LightboxPhoto } from "./Lightbox";

export function PizzeriaGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [filter, setFilter] = useState<GallerySection | "all">("all");
  const [open, setOpen] = useState<LightboxPhoto | null>(null);
  const [failed, setFailed] = useState<Set<string>>(new Set());

  if (photos.length === 0) return null;

  const sections = GALLERY_SECTIONS.filter((s) => photos.some((p) => p.section === s.id));
  const shown = filter === "all" ? photos : photos.filter((p) => p.section === filter);
  const hasIllustrations = photos.some((p) => p.source === "illustration");

  return (
    <section className="discover" aria-labelledby="discover-h">
      <div className="sec-h">
        <h2 id="discover-h">Découvrez notre pizzeria</h2>
      </div>
      <p className="discover-intro">
        {hasIllustrations
          ? "Les images marquées « Photo d'illustration » ne sont pas des photos de notre pizzeria. Toutes les autres ont été prises sur place."
          : "Photos prises sur place, dans la pizzeria."}
      </p>

      {sections.length > 1 && (
        <div className="tabs" role="group" aria-label="Filtrer les photos">
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            Tout
          </button>
          {sections.map((s) => (
            <button key={s.id} type="button" aria-pressed={filter === s.id} onClick={() => setFilter(s.id)}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="photo-grid">
        {shown.map((p) => {
          const src = imageUrl(p.image_path);
          const illustration = p.source === "illustration";
          const broken = failed.has(p.id);
          return (
            <figure className="ph-tile" key={p.id}>
              {broken ? (
                <div className="ph-missing">Photo indisponible</div>
              ) : (
                <button
                  type="button"
                  className="ph-open"
                  aria-label={`Agrandir : ${p.caption || p.alt}`}
                  onClick={() =>
                    setOpen({ src, alt: p.alt, title: p.caption || "Pizza Milano", caption: undefined, illustration })
                  }
                >
                  <Image
                    src={src}
                    alt={p.alt}
                    fill
                    sizes="(max-width: 720px) 46vw, (max-width: 980px) 30vw, 260px"
                    onError={() => setFailed((f) => new Set(f).add(p.id))}
                  />
                </button>
              )}
              {illustration && <span className="ph-badge ph-badge-top">Photo d&apos;illustration</span>}
              {p.caption && <figcaption className="ph-cap">{p.caption}</figcaption>}
            </figure>
          );
        })}
      </div>

      <Lightbox photo={open} onClose={() => setOpen(null)} />
    </section>
  );
}
