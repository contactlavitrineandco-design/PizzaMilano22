"use server";

import { getStaffRole } from "@/lib/auth";
import { GALLERY_SECTIONS, PHOTO_BUCKET, STORAGE_PATH_RE } from "@/lib/images";
import { createSessionClient } from "@/lib/supabase/server";
import type { GallerySection, ImageSource } from "@/lib/types";

/**
 * Gestion des photos, réservée au rôle admin.
 *
 * Le fichier est d'abord envoyé par le navigateur dans le stockage Supabase
 * (policies : admin uniquement, 5 Mo max, webp/jpeg/png). Ces actions
 * vérifient ensuite côté serveur le fichier réellement stocké (taille et
 * signature binaire) avant de l'associer à un produit ou à la galerie.
 * Un fichier refusé est supprimé.
 */

export type PhotoActionResult = { ok: true } | { ok: false; message: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BYTES = 5 * 1024 * 1024;
const SOURCES: ImageSource[] = ["restaurant", "illustration"];
const SECTION_IDS = GALLERY_SECTIONS.map((s) => s.id);

const FORBIDDEN: PhotoActionResult = { ok: false, message: "Seul le compte administrateur peut gérer les photos." };
const INVALID: PhotoActionResult = { ok: false, message: "Demande invalide. Rechargez la page." };
const FAILED: PhotoActionResult = { ok: false, message: "La modification n'a pas été enregistrée. Réessayez." };

async function adminClient() {
  if ((await getStaffRole()) !== "admin") return null;
  return createSessionClient();
}

type Db = NonNullable<Awaited<ReturnType<typeof adminClient>>>;

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ");
  return t.length <= max ? t : null;
}

function isStoragePath(p: string | null | undefined): p is string {
  return !!p && STORAGE_PATH_RE.test(p);
}

/** Vérifie le fichier stocké : présent, ≤ 5 Mo, vraie image webp/jpeg/png. Supprime le fichier sinon. */
async function verifyStoredImage(db: Db, path: string, folder: "products" | "gallery"): Promise<string | null> {
  if (!STORAGE_PATH_RE.test(path) || !path.startsWith(`${folder}/`)) return "Fichier invalide.";
  const { data, error } = await db.storage.from(PHOTO_BUCKET).download(path);
  if (error || !data) return "Le fichier n'a pas été trouvé dans le stockage. Recommencez l'envoi.";
  const reject = async (msg: string) => {
    await db.storage.from(PHOTO_BUCKET).remove([path]);
    return msg;
  };
  if (data.size === 0 || data.size > MAX_BYTES) return reject("La photo doit peser moins de 5 Mo.");
  const b = new Uint8Array(await data.slice(0, 12).arrayBuffer());
  const isJpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const isPng = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const isWebp =
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
  if (!isJpeg && !isPng && !isWebp) return reject("Ce fichier n'est pas une image JPEG, PNG ou WebP.");
  return null;
}

async function removeStored(db: Db, path: string | null | undefined) {
  if (!isStoragePath(path)) return; // les photos livrées avec le site (/photos/…) ne sont pas supprimées
  const { error } = await db.storage.from(PHOTO_BUCKET).remove([path]);
  if (error) console.error("[photos] suppression du fichier impossible", path, error.message);
}

/* ------------------------------------------------------------------ */
/* Photos des produits                                                 */
/* ------------------------------------------------------------------ */

export async function setProductPhoto(input: {
  productId: string;
  path: string | null; // null = garder le fichier actuel, ne modifier que texte/source
  alt: string;
  source: ImageSource;
}): Promise<PhotoActionResult> {
  const db = await adminClient();
  if (!db) return FORBIDDEN;
  const alt = cleanText(input.alt, 200);
  if (!UUID_RE.test(input.productId) || !alt || !SOURCES.includes(input.source)) return INVALID;

  const { data: current, error: readError } = await db
    .from("products")
    .select("image_path")
    .eq("id", input.productId)
    .single();
  if (readError || !current) return INVALID;

  if (input.path === null) {
    if (!current.image_path) return { ok: false, message: "Choisissez d'abord une photo." };
    const { error } = await db
      .from("products")
      .update({ image_alt: alt, image_source: input.source })
      .eq("id", input.productId);
    return error ? FAILED : { ok: true };
  }

  const problem = await verifyStoredImage(db, input.path, "products");
  if (problem) return { ok: false, message: problem };

  const { error } = await db
    .from("products")
    .update({
      image_path: input.path,
      image_alt: alt,
      image_source: input.source,
      image_updated_at: new Date().toISOString(),
    })
    .eq("id", input.productId);
  if (error) {
    console.error("[photos] produit", error.message);
    await removeStored(db, input.path);
    return FAILED;
  }
  if (current.image_path !== input.path) await removeStored(db, current.image_path);
  return { ok: true };
}

export async function removeProductPhoto(productId: string): Promise<PhotoActionResult> {
  const db = await adminClient();
  if (!db) return FORBIDDEN;
  if (!UUID_RE.test(productId)) return INVALID;
  const { data: current } = await db.from("products").select("image_path").eq("id", productId).single();
  const { error } = await db
    .from("products")
    .update({ image_path: null, image_alt: null, image_source: null, image_updated_at: new Date().toISOString() })
    .eq("id", productId);
  if (error) return FAILED;
  await removeStored(db, current?.image_path);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Galerie de la pizzeria                                              */
/* ------------------------------------------------------------------ */

interface GalleryFields {
  section: GallerySection;
  alt: string;
  caption: string;
  source: ImageSource;
}

function checkGalleryFields(f: GalleryFields): GalleryFields | null {
  const alt = cleanText(f.alt, 200);
  const caption = cleanText(f.caption ?? "", 120);
  if (!alt || caption === null || !SECTION_IDS.includes(f.section) || !SOURCES.includes(f.source)) return null;
  return { section: f.section, alt, caption, source: f.source };
}

export async function addGalleryPhoto(input: GalleryFields & { path: string }): Promise<PhotoActionResult> {
  const db = await adminClient();
  if (!db) return FORBIDDEN;
  const fields = checkGalleryFields(input);
  if (!fields) return INVALID;
  const problem = await verifyStoredImage(db, input.path, "gallery");
  if (problem) return { ok: false, message: problem };

  const { data: last } = await db
    .from("gallery_photos")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await db
    .from("gallery_photos")
    .insert({ ...fields, image_path: input.path, sort_order: (last?.sort_order ?? 0) + 10, published: true });
  if (error) {
    console.error("[photos] galerie", error.message);
    await removeStored(db, input.path);
    return FAILED;
  }
  return { ok: true };
}

export async function updateGalleryPhoto(
  id: string,
  input: GalleryFields & { path: string | null },
): Promise<PhotoActionResult> {
  const db = await adminClient();
  if (!db) return FORBIDDEN;
  const fields = checkGalleryFields(input);
  if (!UUID_RE.test(id) || !fields) return INVALID;
  const { data: current } = await db.from("gallery_photos").select("image_path").eq("id", id).single();
  if (!current) return INVALID;

  if (input.path) {
    const problem = await verifyStoredImage(db, input.path, "gallery");
    if (problem) return { ok: false, message: problem };
  }
  const { error } = await db
    .from("gallery_photos")
    .update(input.path ? { ...fields, image_path: input.path } : fields)
    .eq("id", id);
  if (error) {
    if (input.path) await removeStored(db, input.path);
    return FAILED;
  }
  if (input.path && current.image_path !== input.path) await removeStored(db, current.image_path);
  return { ok: true };
}

export async function setGalleryPhotoPublished(id: string, published: boolean): Promise<PhotoActionResult> {
  const db = await adminClient();
  if (!db) return FORBIDDEN;
  if (!UUID_RE.test(id) || typeof published !== "boolean") return INVALID;
  const { error } = await db.from("gallery_photos").update({ published }).eq("id", id);
  return error ? FAILED : { ok: true };
}

export async function moveGalleryPhoto(id: string, direction: "up" | "down"): Promise<PhotoActionResult> {
  const db = await adminClient();
  if (!db) return FORBIDDEN;
  if (!UUID_RE.test(id) || (direction !== "up" && direction !== "down")) return INVALID;
  const { data } = await db.from("gallery_photos").select("id, sort_order").order("sort_order").order("created_at");
  const list = data ?? [];
  const i = list.findIndex((p) => p.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true };
  // Renumérote proprement (10, 20, 30…) avec les deux photos échangées
  const ordered = [...list];
  [ordered[i], ordered[j]] = [ordered[j]!, ordered[i]!];
  for (let k = 0; k < ordered.length; k++) {
    const want = (k + 1) * 10;
    if (ordered[k]!.sort_order !== want) {
      const { error } = await db.from("gallery_photos").update({ sort_order: want }).eq("id", ordered[k]!.id);
      if (error) return FAILED;
    }
  }
  return { ok: true };
}

export async function deleteGalleryPhoto(id: string): Promise<PhotoActionResult> {
  const db = await adminClient();
  if (!db) return FORBIDDEN;
  if (!UUID_RE.test(id)) return INVALID;
  const { data: current } = await db.from("gallery_photos").select("image_path").eq("id", id).single();
  const { error } = await db.from("gallery_photos").delete().eq("id", id);
  if (error) return FAILED;
  await removeStored(db, current?.image_path);
  return { ok: true };
}

/** Supprime un fichier envoyé puis abandonné (aperçu annulé, erreur d'enregistrement). */
export async function discardUpload(path: string): Promise<PhotoActionResult> {
  const db = await adminClient();
  if (!db) return FORBIDDEN;
  if (!STORAGE_PATH_RE.test(path)) return INVALID;
  // On ne supprime que les fichiers qui ne sont utilisés nulle part.
  const [{ count: inProducts }, { count: inGallery }] = await Promise.all([
    db.from("products").select("id", { count: "exact", head: true }).eq("image_path", path),
    db.from("gallery_photos").select("id", { count: "exact", head: true }).eq("image_path", path),
  ]);
  if ((inProducts ?? 0) > 0 || (inGallery ?? 0) > 0) return { ok: true };
  await removeStored(db, path);
  return { ok: true };
}
