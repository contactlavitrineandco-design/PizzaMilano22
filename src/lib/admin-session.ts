import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Session de l'espace gérant.
 *
 * Après un code correct (vérifié en base par verify_admin_code), le serveur
 * pose un cookie httpOnly signé (HMAC-SHA256 avec ADMIN_SESSION_SECRET) qui
 * contient la date d'expiration et la version du code. Chaque page et chaque
 * action du gérant revérifie la signature, l'expiration et la version : changer
 * le code ferme donc toutes les sessions ouvertes.
 */

export const ADMIN_COOKIE = "pm_gerant";
const SESSION_SECONDS = 12 * 60 * 60;

function secret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

/** L'espace gérant ne fonctionne que si le secret de session et la clé de service sont configurés. */
export function adminConfigured(): boolean {
  return secret() !== null && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

interface CodeState {
  version: number;
  is_default: boolean;
}

export async function codeState(): Promise<CodeState | null> {
  const { data, error } = await createAdminClient().rpc("admin_code_state");
  if (error || !data) {
    console.error("[gérant] état du code", error?.message);
    return null;
  }
  const d = data as Record<string, unknown>;
  return { version: Number(d.version), is_default: Boolean(d.is_default) };
}

/** Empreinte de l'appareil pour limiter les essais (adresse IP hachée, jamais stockée en clair). */
export async function clientFingerprint(): Promise<string> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || h.get("x-real-ip") || "inconnu";
  return createHash("sha256")
    .update(`${secret() ?? ""}|${ip}`)
    .digest("hex")
    .slice(0, 32);
}

export async function openSession(version: number): Promise<void> {
  const key = secret();
  if (!key) throw new Error("ADMIN_SESSION_SECRET manquant");
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `${exp}.${version}`;
  (await cookies()).set(ADMIN_COOKIE, `${payload}.${sign(payload, key)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/gerant",
    maxAge: SESSION_SECONDS,
  });
}

export async function closeSession(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, "", { path: "/gerant", maxAge: 0 });
}

function validSignature(raw: string, key: string): { exp: number; version: number } | null {
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [exp, version, sig] = parts as [string, string, string];
  if (!/^\d{1,12}$/.test(exp) || !/^\d{1,9}$/.test(version)) return null;
  const expected = Buffer.from(sign(`${exp}.${version}`, key));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return { exp: Number(exp), version: Number(version) };
}

/** true si la requête vient d'un gérant connecté (cookie valide, non expiré, version du code à jour). */
export async function isAdmin(): Promise<boolean> {
  const key = secret();
  if (!key) return false;
  // Plusieurs cookies du même nom peuvent coexister (chemins différents) : on les vérifie tous.
  const header = (await headers()).get("cookie") ?? "";
  const sessions = header
    .split(";")
    .map((c) => c.trim())
    .filter((c) => c.startsWith(`${ADMIN_COOKIE}=`))
    .map((c) => validSignature(decodeURIComponent(c.slice(ADMIN_COOKIE.length + 1)), key))
    .filter((v): v is { exp: number; version: number } => v !== null);
  if (sessions.length === 0) return false;
  const state = await codeState();
  return state !== null && sessions.some((s) => s.version === state.version);
}
