import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaffRole } from "@/lib/auth";
import { toGalleryPhoto, toProduct } from "@/lib/data";
import { createSessionClient } from "@/lib/supabase/server";
import { PhotoManager } from "./PhotoManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Photos · Pizza Milano", robots: { index: false } };

export default async function PhotosPage() {
  const role = await getStaffRole();
  if (!role) redirect("/login");
  if (role !== "admin") redirect("/pizzeria");

  const supabase = await createSessionClient();
  const [products, gallery] = await Promise.all([
    supabase.from("products").select("*").order("category").order("sort_order"),
    supabase.from("gallery_photos").select("*").order("sort_order").order("created_at"),
  ]);
  if (products.error || gallery.error) throw new Error("Lecture des photos impossible");

  return (
    <PhotoManager
      products={(products.data ?? []).map(toProduct)}
      gallery={(gallery.data ?? []).map(toGalleryPhoto)}
    />
  );
}
