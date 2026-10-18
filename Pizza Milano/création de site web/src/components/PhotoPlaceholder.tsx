/** Emplacement sobre pour un produit sans photo : panneau aux lattes de bois + pictogramme pizza. */
export function PhotoPlaceholder() {
  return (
    <div className="item-photo ph-soon" aria-hidden="true">
      <svg viewBox="0 0 48 48" width="56" height="56">
        <circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="24" cy="24" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".6" />
        <path d="M24 24 L24 5 M24 24 L40.5 33.5 M24 24 L7.5 33.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="19" cy="15" r="1.8" fill="currentColor" />
        <circle cx="31" cy="19" r="1.8" fill="currentColor" />
        <circle cx="24" cy="33" r="1.8" fill="currentColor" />
      </svg>
    </div>
  );
}
