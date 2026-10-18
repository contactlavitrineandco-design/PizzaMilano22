/** Affiche une information légale, ou un repère bien visible tant qu'elle n'est pas remplie. */
export function LegalField({ value, label }: { value: string | null | undefined; label: string }) {
  if (value) return <>{value}</>;
  return <mark className="legal-missing">[à compléter : {label}]</mark>;
}
