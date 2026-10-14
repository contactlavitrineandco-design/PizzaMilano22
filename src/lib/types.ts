export type Category = "tomate" | "creme" | "souffle" | "boisson";
export type OrderStatus = "new" | "prep" | "ready" | "done" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type StaffRole = "admin" | "staff";

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
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  online_orders_open: boolean;
  opening_hours: OpeningHours;
  opening_hours_provisional: boolean;
  min_prep_minutes: number;
  slot_interval_minutes: number;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  supplement_name: string | null;
  supplement_price: number | null;
  meat: string | null;
  line_total: number;
  category: Category | null;
}

export interface Order {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  pickup_time: string; // ISO
  note: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total: number;
  created_at: string;
  cancelled_by: "client" | "restaurant" | null;
  items: OrderItem[];
}

/** Ligne de panier telle que stockée dans le navigateur : aucun prix. */
export interface CartLine {
  productId: string;
  quantity: number;
  supplementId: string | null;
  meat: string | null;
}
