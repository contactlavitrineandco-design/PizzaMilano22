import { MEATS } from "@/lib/menu";
import type { CartLine } from "@/lib/types";

export interface OrderInput {
  name: string;
  phone: string; // normalisé "06 12 34 56 78"
  pickup: string; // "HH:MM"
  note: string;
  items: CartLine[];
}

export type FieldErrors = Partial<Record<"name" | "phone" | "pickup" | "note" | "items", string>>;

export type ValidationResult = { ok: true; value: OrderInput } | { ok: false; errors: FieldErrors; spam?: boolean };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;
const HM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const LIMITS = { nameMax: 40, noteMax: 200, linesMax: 30, quantityMax: 20, totalQuantityMax: 50 };

/** Accepte 0612345678, 06 12 34 56 78, 06.12.34.56.78, +33 6 12 34 56 78, 0033… */
export function normalizeFrenchPhone(raw: string): string | null {
  let digits = raw.replace(/[\s.\-()]/g, "");
  if (digits.startsWith("+33")) digits = "0" + digits.slice(3);
  else if (digits.startsWith("0033")) digits = "0" + digits.slice(4);
  if (!/^0[1-9]\d{8}$/.test(digits)) return null;
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ");
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Validation serveur de tout ce qui vient du navigateur. Aucun prix n'est accepté. */
export function validateOrderInput(raw: unknown): ValidationResult {
  const errors: FieldErrors = {};
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  // Champ piège invisible : rempli uniquement par les robots.
  if (asString(obj.website).trim() !== "") return { ok: false, errors: {}, spam: true };

  const name = asString(obj.name).trim().replace(/\s+/g, " ");
  if (!name) errors.name = "Indiquez votre prénom.";
  else if (name.length > LIMITS.nameMax) errors.name = `Prénom trop long (${LIMITS.nameMax} caractères maximum).`;
  else if (!NAME_RE.test(name)) errors.name = "Le prénom ne doit contenir que des lettres.";

  const phone = normalizeFrenchPhone(asString(obj.phone));
  if (!phone) errors.phone = "Indiquez un numéro français à 10 chiffres, par exemple 06 12 34 56 78.";

  const pickup = asString(obj.pickup);
  if (!HM_RE.test(pickup)) errors.pickup = "Choisissez une heure de retrait.";

  const note = asString(obj.note).trim();
  if (note.length > LIMITS.noteMax) errors.note = `Remarque trop longue (${LIMITS.noteMax} caractères maximum).`;

  const items: CartLine[] = [];
  const rawItems = Array.isArray(obj.items) ? obj.items : [];
  if (rawItems.length === 0) errors.items = "Votre panier est vide.";
  else if (rawItems.length > LIMITS.linesMax) errors.items = "Votre panier contient trop de lignes.";
  else {
    let totalQty = 0;
    for (const it of rawItems) {
      const line = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
      const productId = asString(line.productId);
      const quantity = line.quantity;
      const supplementId = line.supplementId == null ? null : asString(line.supplementId);
      const meat = line.meat == null ? null : asString(line.meat);
      const validQty =
        typeof quantity === "number" && Number.isInteger(quantity) && quantity >= 1 && quantity <= LIMITS.quantityMax;
      if (
        !UUID_RE.test(productId) ||
        !validQty ||
        (supplementId !== null && !UUID_RE.test(supplementId)) ||
        (meat !== null && !(MEATS as readonly string[]).includes(meat))
      ) {
        errors.items = "Votre panier contient un article invalide. Rechargez la page.";
        break;
      }
      totalQty += quantity;
      items.push({ productId, quantity, supplementId, meat });
    }
    if (!errors.items && totalQty > LIMITS.totalQuantityMax) {
      errors.items = `${LIMITS.totalQuantityMax} articles maximum par commande en ligne.`;
    }
  }

  if (Object.keys(errors).length > 0 || !phone) return { ok: false, errors };
  return { ok: true, value: { name, phone, pickup, note, items } };
}
