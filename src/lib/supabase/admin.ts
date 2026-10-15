import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicSupabaseEnv } from "@/lib/env";

/**
 * Client « service » : contourne RLS. Utilisé UNIQUEMENT côté serveur : création
 * des commandes (create_order), suivi client, et actions de l'espace gérant après
 * vérification de la session (isAdmin). L'import "server-only"
 * fait échouer la compilation si ce fichier est importé côté navigateur.
 */
export function createAdminClient() {
  const { url } = publicSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante (variable serveur, voir .env.example).");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
