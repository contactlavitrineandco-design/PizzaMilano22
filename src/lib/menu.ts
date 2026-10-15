import type { Category } from "./types";

export const CATEGORIES: { id: Category; name: string; cls: string; sub: string }[] = [
  { id: "tomate", name: "Base tomate", cls: "red", sub: "Sauce tomate maison" },
  { id: "creme", name: "Base crème", cls: "green", sub: "Crème fraîche" },
  { id: "souffle", name: "Soufflés", cls: "", sub: "10 € · frites incluses" },
  { id: "boisson", name: "Boissons", cls: "", sub: "Bien fraîches" },
];
