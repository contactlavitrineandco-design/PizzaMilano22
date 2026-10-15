"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Client navigateur (clé publique) : sert au temps réel de l'espace pizzeria. */
export function createBrowserSupabase() {
  // Références littérales pour l'intégration par Next.js au moment du build.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createBrowserClient(url, anonKey);
}
