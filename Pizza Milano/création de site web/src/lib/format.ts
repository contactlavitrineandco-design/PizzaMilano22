export function eur(value: number): string {
  return value.toFixed(2).replace(".", ",") + " €";
}
