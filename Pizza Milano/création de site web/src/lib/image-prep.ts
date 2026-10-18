"use client";

/**
 * Préparation d'une photo dans le navigateur, avant tout envoi :
 * - orientation corrigée (photos de téléphone) ;
 * - redimensionnée à 1600 px maximum ;
 * - réencodée en WebP (JPEG si le navigateur ne sait pas faire de WebP).
 * Le réencodage supprime aussi les métadonnées (EXIF, position GPS).
 */

export const MAX_SIDE = 1600;
const MAX_INPUT_BYTES = 30 * 1024 * 1024;

export interface PreparedImage {
  blob: Blob;
  ext: "webp" | "jpg";
  contentType: "image/webp" | "image/jpeg";
  width: number;
  height: number;
  previewUrl: string;
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // repli ci-dessous
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
    throw new Error("Choisissez un fichier image (JPEG, PNG, WebP ou photo de téléphone).");
  }
  if (file.size > MAX_INPUT_BYTES) throw new Error("Cette photo est trop lourde (30 Mo maximum).");

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    throw new Error(
      "Ce navigateur ne sait pas lire ce format. Exportez la photo en JPEG (sur iPhone : Réglages > Appareil photo > Formats > Le plus compatible).",
    );
  }

  const w0 = "naturalWidth" in source ? source.naturalWidth : source.width;
  const h0 = "naturalHeight" in source ? source.naturalHeight : source.height;
  if (w0 < 400 || h0 < 300) throw new Error("Photo trop petite : 400 × 300 pixels minimum pour rester nette.");
  const scale = Math.min(1, MAX_SIDE / Math.max(w0, h0));
  const width = Math.round(w0 * scale);
  const height = Math.round(h0 * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Préparation de la photo impossible sur cet appareil.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  if ("close" in source) source.close();

  let blob = await toBlob(canvas, "image/webp", 0.82);
  let contentType: PreparedImage["contentType"] = "image/webp";
  let ext: PreparedImage["ext"] = "webp";
  if (!blob || blob.type !== "image/webp") {
    blob = await toBlob(canvas, "image/jpeg", 0.85);
    contentType = "image/jpeg";
    ext = "jpg";
  }
  if (!blob) throw new Error("Préparation de la photo impossible sur cet appareil.");
  if (blob.size > 5 * 1024 * 1024) throw new Error("La photo préparée dépasse 5 Mo. Essayez une autre photo.");

  return { blob, ext, contentType, width, height, previewUrl: URL.createObjectURL(blob) };
}
