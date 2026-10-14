"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { submitOrder, type SubmitOrderResult } from "@/app/commander/actions";
import { eur } from "@/lib/format";
import { CATEGORIES, MEATS } from "@/lib/menu";
import type { OrderingWindow } from "@/lib/time";
import type { CartLine, Category, Product, Supplement } from "@/lib/types";
import { setCart, useCart } from "./cart-store";
import { saveMyOrder, useMyOrder } from "./my-order";
import { Lightbox, type LightboxPhoto } from "./Lightbox";
import { ProductImage } from "./ProductImage";

type Mode = "browse" | "order";
type Confirmation = Extract<SubmitOrderResult, { ok: true }>["order"];

interface Props {
  products: Product[];
  supplements: Supplement[];
  ordering: OrderingWindow;
  mode: Mode;
  /** Contenu affiché sous la carte, à côté du panier (galerie de la pizzeria sur l'accueil). */
  children?: ReactNode;
}

export function Shop({ products, supplements, ordering, mode, children }: Props) {
  const router = useRouter();
  const lines = useCart();
  const [cat, setCat] = useState<Category>("tomate");
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupChoice, setPickupChoice] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState(""); // champ piège anti-robots
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [pending, startTransition] = useTransition();
  const [photo, setPhoto] = useState<LightboxPhoto | null>(null);
  const myOrder = useMyOrder();

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const supplementById = useMemo(() => new Map(supplements.map((s) => [s.id, s])), [supplements]);

  // Les produits passés en rupture (ou supprimés) disparaissent du panier.
  const validLines = useMemo(() => lines.filter((l) => productById.get(l.productId)?.available), [lines, productById]);

  const pickup = ordering.slots.includes(pickupChoice) ? pickupChoice : (ordering.slots[0] ?? "");

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }

  function supplementsFor(category: Category) {
    return supplements.filter((s) => s.applies_to.includes(category));
  }

  /** Prix affiché à titre indicatif. Le prix facturé est recalculé par le serveur. */
  function linePrice(l: CartLine): number {
    const p = productById.get(l.productId);
    if (!p) return 0;
    const s = l.supplementId ? supplementById.get(l.supplementId) : undefined;
    return (p.price + (s?.price ?? 0)) * l.quantity;
  }

  function add(product: Product) {
    if (!product.available) return;
    const defaultMeat = product.category === "souffle" ? MEATS[0] : null;
    const next = [...validLines];
    const existing = next.findIndex(
      (l) => l.productId === product.id && l.supplementId === null && l.meat === defaultMeat,
    );
    if (existing >= 0) {
      const line = next[existing]!;
      next[existing] = { ...line, quantity: Math.min(20, line.quantity + 1) };
    } else {
      next.push({ productId: product.id, quantity: 1, supplementId: null, meat: defaultMeat });
    }
    setCart(next);
    showToast(`${product.name} ajoutée au panier`);
  }

  function updateLine(index: number, patch: Partial<CartLine>) {
    const next = [...validLines];
    const line = next[index];
    if (!line) return;
    const updated = { ...line, ...patch };
    if (updated.quantity <= 0) next.splice(index, 1);
    else next[index] = { ...updated, quantity: Math.min(20, updated.quantity) };
    setCart(next);
  }

  const total = validLines.reduce((a, l) => a + linePrice(l), 0);
  const count = validLines.reduce((a, l) => a + l.quantity, 0);
  const canSubmit = ordering.canOrder && validLines.length > 0 && !pending;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setInvalid(new Set());
    startTransition(async () => {
      const res = await submitOrder({ name, phone, pickup, note, website, items: validLines });
      if (res.ok) {
        setCart([]);
        setNote("");
        setCartOpen(false);
        setConfirmation(res.order);
        if (res.order.token) saveMyOrder({ token: res.order.token, number: res.order.number, pickup: res.order.pickup });
        router.refresh();
        return;
      }
      setError(res.message);
      setInvalid(new Set(res.fields ?? []));
      if (res.refresh) router.refresh();
    });
  }

  const pizzaSupps = supplementsFor("tomate").filter((s) => s.available);
  const souffleSupps = supplementsFor("souffle").filter((s) => s.available);

  return (
    <>
      <div className="wrap shop">
        <div className="shop-main">
          {myOrder && (
            <Link className="my-order" href={`/commande/${myOrder.token}`}>
              <span>
                Votre commande <b>#{myOrder.number}</b> · retrait à {myOrder.pickup}
              </span>
              <span className="my-order-go">Suivre ou annuler →</span>
            </Link>
          )}
          <section aria-label="Carte" id="carte">
            <div className="tabs" role="group" aria-label="Rubriques de la carte">
              {CATEGORIES.map((c) => (
                <button key={c.id} type="button" aria-pressed={c.id === cat} onClick={() => setCat(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>

            {/* Toutes les rubriques sont dans la page ; les onglets masquent les autres. */}
            {CATEGORIES.map((category) => {
              const items = products.filter((p) => p.category === category.id);
              const categoryHasPhoto = items.some((p) => p.image_path);
              return (
                <div key={category.id} hidden={category.id !== cat}>
                  <div className="sec-h">
                    <h2 className={category.cls}>{category.name}</h2>
                    <span>{category.sub}</span>
                  </div>
                  <div className="grid">
                    {items.map((p) => (
                      <article key={p.id} className={`item${p.available ? "" : " off"}`}>
                        <ProductImage product={p} onOpen={setPhoto} placeholder={categoryHasPhoto} />
                        {p.tag && p.available && <span className="tag">{p.tag}</span>}
                        {!p.available && <span className="tag">Victime de son succès</span>}
                        <h3>{p.name}</h3>
                        <p className="ing">{p.description}</p>
                        <div className="row">
                          <span className="price num">{eur(p.price)}</span>
                          <button
                            type="button"
                            className="add"
                            disabled={!p.available}
                            aria-label={`Ajouter ${p.name}`}
                            onClick={() => add(p)}
                          >
                            {p.available ? "Ajouter" : "Épuisé"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}

            {(pizzaSupps.length > 0 || souffleSupps.length > 0) && (
              <div className="extras">
                {pizzaSupps.length > 0 && (
                  <>
                    <b>Suppléments pizza :</b>{" "}
                    {pizzaSupps.map((s) => `${s.name.toLowerCase()} +${eur(s.price)}`).join(" · ")}
                  </>
                )}
                {souffleSupps.length > 0 && (
                  <>
                    {pizzaSupps.length > 0 && " — "}
                    <b>Soufflés :</b> {souffleSupps.map((s) => `${s.name.toLowerCase()} +${eur(s.price)}`).join(" · ")}
                  </>
                )}{" "}
                — à choisir dans le panier.
              </div>
            )}
          </section>
          {children}
        </div>

        <aside className={`cart${cartOpen ? " open" : ""}`} aria-label="Panier">
          <div className="cart-h">
            <h2>Votre commande</h2>
            <button
              type="button"
              className="ghost"
              style={{ minHeight: 36, padding: "6px 10px" }}
              aria-label="Fermer le panier"
              onClick={() => setCartOpen(false)}
            >
              Fermer
            </button>
          </div>

          <div className="cart-body">
            {validLines.length === 0 ? (
              <div className="empty">
                Votre panier est vide.
                <br />
                Ajoutez une pizza depuis la carte.
              </div>
            ) : (
              validLines.map((l, k) => {
                const p = productById.get(l.productId)!;
                const isPizza = p.category === "tomate" || p.category === "creme";
                const options = supplementsFor(p.category);
                return (
                  <div className="line" key={`${l.productId}-${l.supplementId}-${l.meat}-${k}`}>
                    <span className="n">{p.name}</span>
                    <div className="qty">
                      <button
                        type="button"
                        aria-label="Retirer un"
                        onClick={() => updateLine(k, { quantity: l.quantity - 1 })}
                      >
                        −
                      </button>
                      <span className="num">{l.quantity}</span>
                      <button
                        type="button"
                        aria-label="Ajouter un"
                        onClick={() => updateLine(k, { quantity: l.quantity + 1 })}
                      >
                        +
                      </button>
                    </div>
                    {(isPizza || p.category === "souffle") && (
                      <div className="opt">
                        {p.category === "souffle" && (
                          <select
                            aria-label="Viande"
                            value={l.meat ?? MEATS[0]}
                            onChange={(e) => updateLine(k, { meat: e.target.value })}
                          >
                            {MEATS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        )}
                        {options.length > 0 && (
                          <select
                            aria-label="Supplément"
                            value={l.supplementId ?? ""}
                            onChange={(e) => updateLine(k, { supplementId: e.target.value || null })}
                          >
                            <option value="">Sans supplément</option>
                            {options.map((s) => (
                              <option key={s.id} value={s.id} disabled={!s.available}>
                                + {s.name} ({eur(s.price)}){s.available ? "" : " — épuisé"}
                              </option>
                            ))}
                          </select>
                        )}
                        <span className="num" style={{ marginLeft: "auto", color: "var(--ink-2)" }}>
                          {eur(linePrice(l))}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {mode === "browse" ? (
            <div className="cart-f">
              <div className="total">
                <span>Total</span>
                <span className="num">{eur(total)}</span>
              </div>
              <Link className="cta" href="/commander">
                {ordering.canOrder ? "Passer la commande" : "Voir la commande"}
              </Link>
            </div>
          ) : (
            <form className="cart-f" noValidate onSubmit={onSubmit}>
              <div className="total">
                <span>Total</span>
                <span className="num">{eur(total)}</span>
              </div>
              <div className="field">
                <label htmlFor="fName">Prénom</label>
                <input
                  id="fName"
                  autoComplete="given-name"
                  placeholder="Ex. Inès"
                  maxLength={40}
                  value={name}
                  aria-invalid={invalid.has("name") || undefined}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="fPhone">Téléphone</label>
                <input
                  id="fPhone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="06 12 34 56 78"
                  maxLength={20}
                  value={phone}
                  aria-invalid={invalid.has("phone") || undefined}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="fTime">Heure de retrait</label>
                <select
                  id="fTime"
                  value={pickup}
                  disabled={ordering.slots.length === 0}
                  aria-invalid={invalid.has("pickup") || undefined}
                  onChange={(e) => setPickupChoice(e.target.value)}
                >
                  {ordering.slots.length === 0 && <option value="">Aucun créneau disponible</option>}
                  {ordering.slots.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="fNote">Remarque (facultatif)</label>
                <textarea
                  id="fNote"
                  rows={2}
                  maxLength={200}
                  placeholder="Bien cuite, sans olives…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="hp" aria-hidden="true">
                <label htmlFor="fWebsite">Ne pas remplir</label>
                <input
                  id="fWebsite"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
              {error && (
                <div className="err" role="alert">
                  {error}
                </div>
              )}
              <button className="cta" type="submit" disabled={!canSubmit}>
                {pending ? "Envoi en cours…" : ordering.canOrder ? "Envoyer la commande" : "Commandes fermées"}
              </button>
            </form>
          )}
        </aside>
      </div>

      <div className="mobile-bar">
        <button type="button" className="cta" onClick={() => setCartOpen(true)}>
          <span>Voir le panier ({count})</span>
          <span className="num">{eur(total)}</span>
        </button>
      </div>

      {confirmation && (
        <div className="overlay">
          <div className="ticket" role="dialog" aria-modal="true" aria-labelledby="cTitle">
            <div className="eyebrow" style={{ color: "#6b4a26" }}>
              Pizza Milano
            </div>
            <h2 id="cTitle">Commande envoyée</h2>
            <div className="big">#{confirmation.number}</div>
            <p>
              Merci {confirmation.name} ! Retrait prévu à <b>{confirmation.pickup}</b>.
              <br />
              Total à régler : <b>{eur(confirmation.total)}</b>
            </p>
            <p style={{ fontSize: 13 }}>Présentez ce numéro au comptoir. Paiement sur place.</p>
            {confirmation.token && (
              <p style={{ fontSize: 13 }}>
                Un empêchement ?{" "}
                <Link href={`/commande/${confirmation.token}`} style={{ color: "#2a1d10", fontWeight: 700 }}>
                  Suivre ou annuler ma commande
                </Link>
              </p>
            )}
            <button type="button" onClick={() => setConfirmation(null)}>
              Retour à la carte
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      <Lightbox photo={photo} onClose={() => setPhoto(null)} />
    </>
  );
}
