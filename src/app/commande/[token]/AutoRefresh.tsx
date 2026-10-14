"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Met à jour le statut de la commande toutes les 30 secondes. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
