"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

export interface LightboxPhoto {
  src: string;
  alt: string;
  title: string;
  caption?: string;
  illustration: boolean;
}

/** Agrandissement d'une photo avec l'élément natif <dialog> (Échap pour fermer, focus géré). */
export function Lightbox({ photo, onClose }: { photo: LightboxPhoto | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (photo && !d.open) d.showModal();
    if (!photo && d.open) d.close();
  }, [photo]);

  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label={photo ? photo.title : "Photo"}
      onClose={onClose}
      onClick={(e) => {
        // clic sur le fond (hors de l'image) : fermer
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {photo && (
        <>
          <div className="lb-frame">
            <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 1100px) 92vw, 1100px" />
            {photo.illustration && <span className="ph-badge">Photo d&apos;illustration</span>}
          </div>
          <div className="lb-bar">
            <div>
              <div className="lb-title">{photo.title}</div>
              {photo.caption && <div className="lb-cap">{photo.caption}</div>}
            </div>
            <button type="button" className="ghost" onClick={onClose} autoFocus>
              Fermer
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
