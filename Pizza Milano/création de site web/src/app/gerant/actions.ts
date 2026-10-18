"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clientFingerprint, closeSession, isAdmin, openSession } from "@/lib/admin-session";
import { PHOTO_BUCKET, STORAGE_PATH_RE } from "@/lib/images";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Category, ImageSource, Weekday } from "@/lib/types";
import { WEEKDAYS } from "@/lib/time";

/**
 * Actions de l'espace gérant. Une action serveur est appelable par n'importe
 * qui : chacune revérifie la session (isAdmin) et valide ses données. La base
 * garde ses propres contraintes (prix positifs, horaires valides, etc.).
 */

export type Result = { ok: true; message?: string } | { ok: false; message: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const CATEGORIES: Category[] = ["tomate", "creme", "souffle", "boisson"];
const SOURCES: ImageSource[] = ["restaurant", "illustration"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const DENIED: Result = { ok: false, message: "Session expirée. Saisissez à nouveau votre code." };
const FAILED: Result = { ok: false, message: "La modification n'a pas été enregistrée. Réessayez." };

function refresh() {
  revalidatePath("/", "layout");
}

function text(v: unknown, max: number, min = 0): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ");
  return t.length >= min && t.length <= max ? t : null;
}

/** "12,50" ou "12.5" → 12.5 ; entre 0 et 100 €, au centime. */
function price(v: unknown): number | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const n = Number(String(v).replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* Connexion                                                           */
/* ------------------------------------------------------------------ */

export async function login(code: string): Promise<Result> {
  if (typeof code !== "string" || !/^\d{6,12}$/.test(code)) return { ok: false, message: "Le code fait au moins 6 chiffres." };
  const { data, error } = await createAdminClient().rpc("verify_admin_code", {
    p_code: code,
    p_client: await clientFingerprint(),
  });
  if (error || !data) {
    console.error("[gérant] connexion", error?.message);
    return { ok: false, message: "Vérification impossible pour le moment. Réessayez." };
  }
  const r = data as { status: string; remaining?: number; version?: number };
  if (r.status === "LOCKED") return { ok: false, message: "Trop d'essais. Réessayez dans 15 minutes." };
  if (r.status !== "OK" || typeof r.version !== "number") {
    const left = r.remaining ?? 0;
    return { ok: false, message: `Code incorrect. ${left} essai${left > 1 ? "s" : ""} avant blocage.` };
  }
  await openSession(r.version);
  revalidatePath("/gerant");
  return { ok: true };
}

export async function logout(): Promise<void> {
  await closeSession();
  revalidatePath("/gerant");
  redirect("/gerant");
}

export async function changeCode(current: string, next: string): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  if (typeof next !== "string" || !/^\d{6,12}$/.test(next)) return { ok: false, message: "Le nouveau code doit faire de 6 à 12 chiffres." };
  if (/^(\d)\1+$/.test(next) || "01234567890123".includes(next) || "98765432109876".includes(next))
    return { ok: false, message: "Code trop facile à deviner (chiffres identiques ou qui se suivent)." };
  const { data, error } = await createAdminClient().rpc("set_admin_code", { p_current: current, p_new: next });
  if (error) return FAILED;
  if (data === "WRONG") return { ok: false, message: "Le code actuel est incorrect." };
  if (data === "INVALID") return { ok: false, message: "Choisissez un nouveau code différent de l'actuel." };
  // La version du code a changé : on rouvre la session de cet appareil, les autres sont fermées.
  const { data: v } = await createAdminClient().rpc("verify_admin_code", { p_code: next, p_client: await clientFingerprint() });
  const version = (v as { version?: number } | null)?.version;
  if (typeof version === "number") await openSession(version);
  revalidatePath("/gerant");
  return { ok: true, message: "Code changé. Les autres appareils devront saisir le nouveau code." };
}

/* ------------------------------------------------------------------ */
/* Commandes en ligne, coordonnées, horaires                           */
/* ------------------------------------------------------------------ */

export async function setOrdersOpen(open: boolean): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  if (typeof open !== "boolean") return FAILED;
  const { error } = await createAdminClient().from("restaurant_settings").update({ online_orders_open: open }).eq("id", 1);
  if (error) return FAILED;
  refresh();
  return { ok: true, message: open ? "Commandes en ligne ouvertes." : "Commandes en ligne en pause." };
}

export async function saveContact(input: { phone: string; instagram: string; prep: string }): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const phoneDigits = typeof input.phone === "string" ? input.phone.replace(/\D/g, "") : "";
  if (!/^0[1-9]\d{8}$/.test(phoneDigits)) return { ok: false, message: "Téléphone : 10 chiffres, par exemple 06 50 64 73 89." };
  const phone = phoneDigits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  const insta = typeof input.instagram === "string" ? input.instagram.trim() : "";
  if (insta && !/^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/.test(insta))
    return { ok: false, message: "Instagram : collez l'adresse du compte, par exemple https://www.instagram.com/milanopizza22/" };
  const prep = Number(input.prep);
  if (!Number.isInteger(prep) || prep < 5 || prep > 180) return { ok: false, message: "Délai de préparation : entre 5 et 180 minutes." };
  const { error } = await createAdminClient()
    .from("restaurant_settings")
    .update({ phone, instagram_url: insta || null, min_prep_minutes: prep })
    .eq("id", 1);
  if (error) return FAILED;
  refresh();
  return { ok: true, message: "Coordonnées enregistrées." };
}

export type HoursInput = Record<Weekday, { open: string; close: string }[]>;

export async function saveHours(input: HoursInput): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const hours = {} as HoursInput;
  for (const d of WEEKDAYS) {
    const ranges = Array.isArray(input?.[d]) ? input[d] : null;
    if (!ranges || ranges.length > 2) return FAILED;
    for (const r of ranges) {
      if (!HM_RE.test(r?.open ?? "") || !HM_RE.test(r?.close ?? "")) return { ok: false, message: "Heure invalide." };
      if (r.open === r.close) return { ok: false, message: "Une plage ne peut pas ouvrir et fermer à la même heure." };
      if (r.close < r.open && r.close > "06:00")
        return { ok: false, message: "Une plage qui passe minuit doit finir au plus tard à 6 h." };
    }
    hours[d] = ranges.map((r) => ({ open: r.open, close: r.close }));
  }
  const { error } = await createAdminClient()
    .from("restaurant_settings")
    .update({ opening_hours: hours, opening_hours_provisional: false })
    .eq("id", 1);
  if (error) return { ok: false, message: "Horaires refusés : vérifiez les plages (ouverture et fermeture)." };
  refresh();
  return { ok: true, message: "Horaires enregistrés." };
}

/* ------------------------------------------------------------------ */
/* Carte                                                               */
/* ------------------------------------------------------------------ */

export interface ProductInput {
  id?: string;
  category?: Category;
  name: string;
  description: string;
  price: string;
  tag: string;
  available: boolean;
}

export async function saveProduct(input: ProductInput): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const name = text(input.name, 80, 1);
  const description = text(input.description, 300);
  const p = price(input.price);
  const tag = text(input.tag, 30);
  if (!name) return { ok: false, message: "Le nom est obligatoire (80 caractères maximum)." };
  if (description === null) return { ok: false, message: "Ingrédients : 300 caractères maximum." };
  if (p === null) return { ok: false, message: "Prix invalide (entre 0 et 100 €)." };
  if (tag === null) return { ok: false, message: "Badge : 30 caractères maximum." };
  if (typeof input.available !== "boolean") return FAILED;
  const db = createAdminClient();
  const values = { name, description, price: p, tag: tag || null, available: input.available, to_confirm: false };

  if (input.id) {
    if (!UUID_RE.test(input.id)) return FAILED;
    const { error } = await db.from("products").update(values).eq("id", input.id);
    if (error) return error.code === "23505" ? { ok: false, message: "Un autre produit porte déjà ce nom." } : FAILED;
    refresh();
    return { ok: true, message: `${name} enregistrée.` };
  }

  if (!input.category || !CATEGORIES.includes(input.category)) return FAILED;
  const { data: last } = await db
    .from("products")
    .select("sort_order")
    .eq("category", input.category)
    .order("sort_order", { ascending: false })
    .limit(1);
  const sort = ((last?.[0]?.sort_order as number | undefined) ?? 0) + 10;
  const { error } = await db.from("products").insert({ ...values, category: input.category, sort_order: sort });
  if (error) return error.code === "23505" ? { ok: false, message: "Un produit porte déjà ce nom." } : FAILED;
  refresh();
  return { ok: true, message: `${name} ajoutée à la carte.` };
}

export async function deleteProduct(id: string): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  if (!UUID_RE.test(id)) return FAILED;
  const db = createAdminClient();
  const { data: current } = await db.from("products").select("image_path").eq("id", id).single();
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) {
    if (error.code === "23503")
      return { ok: false, message: "Ce produit a déjà été commandé : passez-le plutôt en « Épuisé » pour le retirer de la vente." };
    return FAILED;
  }
  await removeStored(current?.image_path as string | null | undefined);
  refresh();
  return { ok: true, message: "Produit supprimé de la carte." };
}

export async function saveSupplement(input: { id: string; price: string; available: boolean }): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const p = price(input.price);
  if (!UUID_RE.test(input.id) || p === null || typeof input.available !== "boolean") return { ok: false, message: "Prix invalide." };
  const { error } = await createAdminClient()
    .from("supplements")
    .update({ price: p, available: input.available })
    .eq("id", input.id);
  if (error) return FAILED;
  refresh();
  return { ok: true, message: "Supplément enregistré." };
}

/* ------------------------------------------------------------------ */
/* Photos des produits                                                 */
/* ------------------------------------------------------------------ */

async function removeStored(path: string | null | undefined) {
  if (!path || !STORAGE_PATH_RE.test(path)) return; // les photos livrées avec le site (/photos/…) restent
  const { error } = await createAdminClient().storage.from(PHOTO_BUCKET).remove([path]);
  if (error) console.error("[gérant] suppression du fichier", path, error.message);
}

function imageKind(b: Uint8Array): "webp" | "jpeg" | "png" | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
    return "webp";
  return null;
}

/** FormData : productId, source (restaurant | illustration), alt, file (déjà réduite en WebP par le navigateur). */
export async function uploadProductPhoto(form: FormData): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const id = form.get("productId");
  const source = form.get("source");
  const alt = text(form.get("alt"), 200, 3);
  const file = form.get("file");
  if (typeof id !== "string" || !UUID_RE.test(id) || !SOURCES.includes(source as ImageSource)) return FAILED;
  if (!alt) return { ok: false, message: "Décrivez la photo en quelques mots (pour les malvoyants et Google)." };
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_PHOTO_BYTES)
    return { ok: false, message: "La photo doit peser moins de 5 Mo." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = imageKind(bytes);
  if (!kind) return { ok: false, message: "Ce fichier n'est pas une photo JPEG, PNG ou WebP." };

  const db = createAdminClient();
  const { data: current, error: readError } = await db.from("products").select("image_path").eq("id", id).single();
  if (readError || !current) return FAILED;

  const ext = kind === "jpeg" ? "jpg" : kind;
  const path = `products/${randomUUID()}.${ext}`;
  const { error: upError } = await db.storage
    .from(PHOTO_BUCKET)
    .upload(path, bytes, { contentType: `image/${kind}`, upsert: false });
  if (upError) {
    console.error("[gérant] envoi photo", upError.message);
    return { ok: false, message: "Envoi de la photo impossible. Réessayez." };
  }
  const { error } = await db
    .from("products")
    .update({ image_path: path, image_alt: alt, image_source: source, image_updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    await removeStored(path);
    return FAILED;
  }
  await removeStored(current.image_path as string | null);
  refresh();
  return { ok: true, message: "Photo publiée." };
}

export async function removeProductPhoto(id: string): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  if (!UUID_RE.test(id)) return FAILED;
  const db = createAdminClient();
  const { data: current } = await db.from("products").select("image_path").eq("id", id).single();
  const { error } = await db
    .from("products")
    .update({ image_path: null, image_alt: null, image_source: null, image_updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return FAILED;
  await removeStored(current?.image_path as string | null | undefined);
  refresh();
  return { ok: true, message: "Photo retirée." };
}
