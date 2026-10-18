"use client";

import { useState } from "react";

/**
 * Carte Google Maps chargée seulement après un clic : tant que le visiteur ne
 * l'a pas demandée, aucune requête n'est envoyée à Google (pas de cookie tiers
 * sans accord, conformément aux recommandations de la CNIL).
 */
export function MapEmbed({ query, label, mapsUrl }: { query: string; label: string; mapsUrl: string }) {
  const [shown, setShown] = useState(false);
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=17&output=embed`;
  return (
    <div className="map-box">
      {shown ? (
        <iframe
          title={`Carte : ${label}`}
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className="map-consent">
          <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
            <path
              d="M12 2c-3.9 0-7 3.1-7 7 0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
              fill="currentColor"
            />
          </svg>
          <p>{label}</p>
          <button type="button" className="cta" onClick={() => setShown(true)}>
            Afficher la carte
          </button>
          <small>
            La carte est fournie par Google, qui peut déposer des cookies. Ou{" "}
            <a href={mapsUrl} target="_blank" rel="noopener">
              ouvrez l&apos;itinéraire dans Google Maps
            </a>
            .
          </small>
        </div>
      )}
    </div>
  );
}
