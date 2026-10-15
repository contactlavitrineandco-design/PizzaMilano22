export type Category = "tomate" | "creme" | "souffle" | "boisson";

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface TimeRange {
  open: string; // "HH:MM"
  close: string; // "HH:MM"
}

export type OpeningHours = Record<Weekday, TimeRange[]>;

/** « restaurant » = vraie photo de Pizza Milano ; « illustration » = image qui ne vient pas du restaurant. */
export type ImageSource = "restaurant" | "illustration";

export interface Product {
  id: string;
  name: string;
  description: string;
  category: Category;
  price: number;
  available: boolean;
  sort_order: number;
  tag: string | null;
  to_confirm: boolean;
  image_path: string | null;
  image_alt: string | null;
  image_source: ImageSource | null;
}

export type GallerySection = "interieur" | "exterieur" | "four" | "preparation" | "pizzas" | "equipe";

export interface GalleryPhoto {
  id: string;
  section: GallerySection;
  image_path: string;
  alt: string;
  caption: string;
  source: ImageSource;
  published: boolean;
  sort_order: number;
}

export interface Supplement {
  id: string;
  name: string;
  price: number;
  available: boolean;
  applies_to: Category[];
  sort_order: number;
}

export interface RestaurantSettings {
  id: number;
  restaurant_name: string;
  address: string | null; // numéro et rue
  postal_code: string | null;
  city: string | null;
  google_maps_url: string | null;
  instagram_url: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  /** Page de commande SumUp (Order & Pay). Vide : le bouton « Commander » propose d'appeler. */
  order_url: string | null;
  /** Une plage dont la fermeture précède l'ouverture se termine le lendemain (dimanche 18:00 → 02:00). */
  opening_hours: OpeningHours;
  opening_hours_provisional: boolean;
}
