import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicSupabaseEnv } from "@/lib/env";

/**
 * Client « service » : contourne RLS. Utilisé UNIQUEMENT pour appeler la
 * fonction create_order() depuis une action serveur. L'import "server-only"
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
