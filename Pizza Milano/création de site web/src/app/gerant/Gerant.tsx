"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { eur } from "@/lib/format";
import { prepareImage } from "@/lib/image-prep";
import { defaultProductAlt, imageUrl } from "@/lib/images";
import { CATEGORIES } from "@/lib/menu";
import { WEEKDAYS } from "@/lib/time";
import type { Category, ImageSource, Product, RestaurantSettings, Supplement, Weekday } from "@/lib/types";
import {
  changeCode,
  deleteProduct,
  logout,
  removeProductPhoto,
  saveContact,
  saveHours,
  saveProduct,
  saveSupplement,
  setOrdersOpen,
  uploadProductPhoto,
  type HoursInput,
  type Result,
} from "./actions";

const DAY_NAMES: Record<Weekday, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

type Notify = (res: Result) => void;

interface Props {
  products: Product[];
  supplements: Supplement[];
  settings: RestaurantSettings;
  defaultCode: boolean;
}

export function Gerant({ products, supplements, settings, defaultCode }: Props) {
  const router = useRouter();
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, start] = useTransition();

  const notify: Notify = (res) => {
    setToast({ ok: res.ok, text: res.ok ? (res.message ?? "Enregistré.") : res.message });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3500);
    if (res.ok) router.refresh();
  };

  return (
    <main className="wrap pro ger">
      <div className="pro-head">
        <h1>Espace gérant</h1>
        <form action={logout}>
          <button type="submit" className="ghost">
            Se déconnecter
          </button>
        </form>
      </div>

      {defaultCode && (
        <p className="ger-warn" role="note">
          Vous utilisez encore le code de départ. Choisissez votre propre code dans « Code d&apos;accès », en bas de page.
        </p>
      )}

      <nav className="ger-nav" aria-label="Rubriques">
        <a href="#commandes">Commandes en ligne</a>
        <a href="#horaires">Horaires</a>
        <a href="#carte-gerant">Carte et photos</a>
        <a href="#supplements">Suppléments</a>
        <a href="#sumup">Carte pour SumUp</a>
        <a href="#coordonnees">Coordonnées</a>
        <a href="#code">Code d&apos;accès</a>
      </nav>

      {/* ---------- Commandes en ligne ---------- */}
      <section className="ger-card" id="commandes" aria-labelledby="h-commandes">
        <div className="ger-row">
          <h2 id="h-commandes">Commandes en ligne</h2>
          <div className="toggle">
            {settings.online_orders_open ? "Ouvertes" : "En pause"}
            <button
              type="button"
              className={settings.online_orders_open ? "offb" : "on"}
              onClick={() => start(async () => notify(await setOrdersOpen(!settings.online_orders_open)))}
            >
              {settings.online_orders_open ? "Mettre en pause" : "Ouvrir"}
            </button>
          </div>
        </div>
        <p className="ger-hint">
          En pause, les clients voient la carte mais ne peuvent pas envoyer de commande. Tant que les commandes du site ne
          sont pas reliées à votre caisse SumUp, laissez-les en pause : sinon personne ne les verrait au comptoir.
        </p>
      </section>

      <HoursSection settings={settings} notify={notify} />
      <MenuSection products={products} notify={notify} />

      {/* ---------- Suppléments ---------- */}
      <section className="ger-card" id="supplements" aria-labelledby="h-supp">
        <h2 id="h-supp">Suppléments</h2>
        <div className="ger-supps">
          {supplements.map((s) => (
            <SupplementRow key={s.id} supplement={s} notify={notify} />
          ))}
        </div>
      </section>

      {/* ---------- Export pour la caisse SumUp ---------- */}
      <section className="ger-card" id="sumup" aria-labelledby="h-sumup">
        <h2 id="h-sumup">Carte pour la caisse SumUp</h2>
        <p className="ger-hint">
          Téléchargez la carte du site (rubrique, nom, prix, description, disponibilité, suppléments) pour l&apos;importer dans
          votre caisse SumUp : la caisse et le site auront les mêmes produits et les mêmes prix. Le fichier s&apos;ouvre dans
          Excel ; recopiez ses colonnes dans le modèle d&apos;import proposé par votre compte SumUp.
        </p>
        <a className="cta ger-save ger-dl" href="/gerant/export-carte" download>
          Télécharger la carte (CSV)
        </a>
      </section>

      <ContactSection settings={settings} notify={notify} />
      <CodeSection notify={notify} />

      {toast && (
        <div className={`toast${toast.ok ? "" : " toast-err"}`} role="status">
          {toast.text}
        </div>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */

function HoursSection({ settings, notify }: { settings: RestaurantSettings; notify: Notify }) {
  const [hours, setHours] = useState<HoursInput>(() => {
    const h = {} as HoursInput;
    for (const d of WEEKDAYS) h[d] = (settings.opening_hours[d] ?? []).map((r) => ({ ...r }));
    return h;
  });
  const [pending, start] = useTransition();

  function setRange(d: Weekday, i: number, key: "open" | "close", v: string) {
    setHours((h) => ({ ...h, [d]: h[d].map((r, k) => (k === i ? { ...r, [key]: v } : r)) }));
  }

  return (
    <section className="ger-card" id="horaires" aria-labelledby="h-horaires">
      <h2 id="h-horaires">Horaires</h2>
      <p className="ger-hint">
        Deux plages maximum par jour. Une plage qui finit après minuit se termine le lendemain (exemple : dimanche 18:00 →
        02:00), au plus tard à 6 h.
      </p>
      <div className="ger-hours">
        {WEEKDAYS.map((d) => (
          <div className="ger-day" key={d}>
            <b>{DAY_NAMES[d]}</b>
            {hours[d].length === 0 && <span className="ger-closed">Fermé</span>}
            {hours[d].map((r, i) => (
              <span className="ger-range" key={i}>
                <input
                  type="time"
                  aria-label={`${DAY_NAMES[d]}, ouverture ${i + 1}`}
                  value={r.open}
                  onChange={(e) => setRange(d, i, "open", e.target.value)}
                />
                –
                <input
                  type="time"
                  aria-label={`${DAY_NAMES[d]}, fermeture ${i + 1}`}
                  value={r.close}
                  onChange={(e) => setRange(d, i, "close", e.target.value)}
                />
                <button
                  type="button"
                  className="ger-x"
                  aria-label={`Retirer la plage ${i + 1} du ${DAY_NAMES[d].toLowerCase()}`}
                  onClick={() => setHours((h) => ({ ...h, [d]: h[d].filter((_, k) => k !== i) }))}
                >
                  ✕
                </button>
              </span>
            ))}
            {hours[d].length < 2 && (
              <button
                type="button"
                className="ghost ger-small"
                onClick={() =>
                  setHours((h) => ({
                    ...h,
                    [d]: [...h[d], h[d].length ? { open: "18:00", close: "23:00" } : { open: "11:00", close: "14:00" }],
                  }))
                }
              >
                + Plage
              </button>
            )}
          </div>
        ))}
      </div>
      <button type="button" className="cta ger-save" disabled={pending} onClick={() => start(async () => notify(await saveHours(hours)))}>
        Enregistrer les horaires
      </button>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function MenuSection({ products, notify }: { products: Product[]; notify: Notify }) {
  const [cat, setCat] = useState<Category>("tomate");
  const items = products.filter((p) => p.category === cat);
  return (
    <section className="ger-card" id="carte-gerant" aria-labelledby="h-carte">
      <h2 id="h-carte">Carte et photos</h2>
      <p className="ger-hint">
        Modifiez le nom, les ingrédients, le prix ou la photo, puis « Enregistrer ». « Épuisé » retire le produit de la vente
        sans l&apos;effacer de la carte.
      </p>
      <div className="tabs" role="group" aria-label="Rubriques">
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button" aria-pressed={c.id === cat} onClick={() => setCat(c.id)}>
            {c.name}
          </button>
        ))}
      </div>
      <div className="ger-products">
        {items.map((p) => (
          <ProductCard key={`${p.id}-${p.image_path ?? ""}`} product={p} notify={notify} />
        ))}
        <NewProduct key={cat} category={cat} notify={notify} />
      </div>
    </section>
  );
}

function ProductCard({ product, notify }: { product: Product; notify: Notify }) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(product.price.toFixed(2).replace(".", ","));
  const [tag, setTag] = useState(product.tag ?? "");
  const [available, setAvailable] = useState(product.available);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [pending, start] = useTransition();
  const dirty =
    name !== product.name ||
    description !== product.description ||
    price !== product.price.toFixed(2).replace(".", ",") ||
    tag !== (product.tag ?? "") ||
    available !== product.available;

  return (
    <article className={`ger-product${available ? "" : " off"}`}>
      <div className="ger-photo">
        {product.image_path ? (
          <Image src={imageUrl(product.image_path)} alt={product.image_alt ?? ""} fill sizes="160px" />
        ) : (
          <PhotoPlaceholder />
        )}
        {product.image_source === "illustration" && <span className="ph-badge">Illustration</span>}
      </div>
      <div className="ger-fields">
        <label>
          Nom
          <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Ingrédients
          <textarea rows={2} value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="ger-inline">
          <label>
            Prix (€)
            <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ""))} />
          </label>
          <label>
            Badge
            <input value={tag} maxLength={30} placeholder="ex. Maison" onChange={(e) => setTag(e.target.value)} />
          </label>
          <label className="ger-check">
            <input type="checkbox" checked={!available} onChange={(e) => setAvailable(!e.target.checked)} />
            Épuisé
          </label>
        </div>
        <div className="adm-actions">
          <button
            type="button"
            className="add"
            disabled={pending || !dirty}
            onClick={() =>
              start(async () => notify(await saveProduct({ id: product.id, name, description, price, tag, available })))
            }
          >
            Enregistrer
          </button>
          <button type="button" className="ghost" onClick={() => setPhotoOpen(true)}>
            {product.image_path ? "Changer la photo" : "Ajouter une photo"}
          </button>
          {confirmDelete ? (
            <>
              <button
                type="button"
                className="adm-danger"
                disabled={pending}
                onClick={() => start(async () => notify(await deleteProduct(product.id)))}
              >
                Confirmer la suppression
              </button>
              <button type="button" className="ghost" onClick={() => setConfirmDelete(false)}>
                Annuler
              </button>
            </>
          ) : (
            <button type="button" className="ghost ger-del" onClick={() => setConfirmDelete(true)}>
              Supprimer
            </button>
          )}
        </div>
      </div>
      {photoOpen && <PhotoDialog product={product} notify={notify} onClose={() => setPhotoOpen(false)} />}
    </article>
  );
}

function PhotoDialog({ product, notify, onClose }: { product: Product; notify: Notify; onClose: () => void }) {
  const [preview, setPreview] = useState<{ url: string; blob: Blob; ext: string } | null>(null);
  const [source, setSource] = useState<ImageSource>(product.image_source ?? "restaurant");
  const [alt, setAlt] = useState(product.image_alt ?? defaultProductAlt(product));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="ger-photo-dialog" role="dialog" aria-modal="true" aria-label={`Photo : ${product.name}`}>
      <div className="ger-card">
        <h3>Photo : {product.name}</h3>
        <div className="adm-preview">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- aperçu local (URL blob)
            <img src={preview.url} alt="Aperçu" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : product.image_path ? (
            <Image src={imageUrl(product.image_path)} alt={product.image_alt ?? ""} fill sizes="480px" />
          ) : (
            <PhotoPlaceholder />
          )}
        </div>
        <label className="ger-file">
          Choisir une photo
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              setError(null);
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const img = await prepareImage(file);
                setPreview({ url: img.previewUrl, blob: img.blob, ext: img.ext });
              } catch (err) {
                setError(err instanceof Error ? err.message : "Photo illisible.");
              }
            }}
          />
        </label>
        <fieldset className="adm-radio">
          <legend>Origine</legend>
          <label>
            <input type="radio" checked={source === "restaurant"} onChange={() => setSource("restaurant")} /> Photo prise chez
            Pizza Milano
          </label>
          <label>
            <input type="radio" checked={source === "illustration"} onChange={() => setSource("illustration")} /> Image
            d&apos;illustration (affichée « Photo d&apos;illustration »)
          </label>
        </fieldset>
        <label className="ger-fields">
          Description de la photo
          <input value={alt} maxLength={200} onChange={(e) => setAlt(e.target.value)} />
        </label>
        {error && (
          <p className="ger-err" role="alert">
            {error}
          </p>
        )}
        <div className="adm-actions">
          <button
            type="button"
            className="add"
            disabled={pending || !preview}
            onClick={() =>
              start(async () => {
                if (!preview) return;
                const form = new FormData();
                form.set("productId", product.id);
                form.set("source", source);
                form.set("alt", alt);
                form.set("file", new File([preview.blob], `photo.${preview.ext}`, { type: preview.blob.type }));
                const res = await uploadProductPhoto(form);
                notify(res);
                if (res.ok) onClose();
                else setError(res.message);
              })
            }
          >
            {pending ? "Envoi…" : "Publier la photo"}
          </button>
          {product.image_path && (
            <button
              type="button"
              className="ghost"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await removeProductPhoto(product.id);
                  notify(res);
                  if (res.ok) onClose();
                })
              }
            >
              Retirer la photo
            </button>
          )}
          <button type="button" className="ghost" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function NewProduct({ category, notify }: { category: Category; notify: Notify }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [pending, start] = useTransition();
  const catName = CATEGORIES.find((c) => c.id === category)?.name ?? "";

  if (!open)
    return (
      <button type="button" className="ghost ger-add" onClick={() => setOpen(true)}>
        + Ajouter un produit ({catName})
      </button>
    );
  return (
    <article className="ger-product ger-new">
      <div className="ger-fields">
        <label>
          Nom
          <input value={name} maxLength={80} placeholder="La …" onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label>
          Ingrédients
          <textarea rows={2} value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="ger-inline">
          <label>
            Prix (€)
            <input inputMode="decimal" value={price} placeholder="12,00" onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ""))} />
          </label>
        </div>
        <div className="adm-actions">
          <button
            type="button"
            className="add"
            disabled={pending || !name.trim() || !price}
            onClick={() =>
              start(async () => {
                const res = await saveProduct({ category, name, description, price, tag: "", available: true });
                notify(res);
                if (res.ok) {
                  setOpen(false);
                  setName("");
                  setDescription("");
                  setPrice("");
                }
              })
            }
          >
            Ajouter à la carte
          </button>
          <button type="button" className="ghost" onClick={() => setOpen(false)}>
            Annuler
          </button>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */

function SupplementRow({ supplement, notify }: { supplement: Supplement; notify: Notify }) {
  const [price, setPrice] = useState(supplement.price.toFixed(2).replace(".", ","));
  const [available, setAvailable] = useState(supplement.available);
  const [pending, start] = useTransition();
  return (
    <div className="ger-supp">
      <b>{supplement.name}</b>
      <label>
        Prix (€)
        <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ""))} />
      </label>
      <label className="ger-check">
        <input type="checkbox" checked={!available} onChange={(e) => setAvailable(!e.target.checked)} />
        Épuisé
      </label>
      <button
        type="button"
        className="add"
        disabled={pending}
        onClick={() => start(async () => notify(await saveSupplement({ id: supplement.id, price, available })))}
      >
        Enregistrer
      </button>
      <small>Actuellement : {eur(supplement.price)}</small>
    </div>
  );
}

function ContactSection({ settings, notify }: { settings: RestaurantSettings; notify: Notify }) {
  const [phone, setPhone] = useState(settings.phone ?? "");
  const [instagram, setInstagram] = useState(settings.instagram_url ?? "");
  const [prep, setPrep] = useState(String(settings.min_prep_minutes));
  const [pending, start] = useTransition();
  return (
    <section className="ger-card" id="coordonnees" aria-labelledby="h-coord">
      <h2 id="h-coord">Coordonnées et préparation</h2>
      <div className="ger-inline ger-wrap">
        <label>
          Téléphone
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="ger-grow">
          Lien Instagram
          <input type="url" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
        </label>
        <label>
          Délai de préparation (min)
          <input inputMode="numeric" value={prep} onChange={(e) => setPrep(e.target.value.replace(/\D/g, ""))} />
        </label>
      </div>
      <p className="ger-hint">Le délai fixe le premier créneau de retrait proposé aux clients.</p>
      <button type="button" className="cta ger-save" disabled={pending} onClick={() => start(async () => notify(await saveContact({ phone, instagram, prep })))}>
        Enregistrer
      </button>
    </section>
  );
}

function CodeSection({ notify }: { notify: Notify }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pending, start] = useTransition();
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 12);
  return (
    <section className="ger-card" id="code" aria-labelledby="h-code">
      <h2 id="h-code">Code d&apos;accès</h2>
      <p className="ger-hint">
        6 à 12 chiffres. Évitez les dates, les chiffres qui se suivent et le numéro de la pizzeria. Changer le code
        déconnecte les autres appareils.
      </p>
      <form
        className="ger-inline ger-wrap"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await changeCode(current, next);
            notify(res);
            if (res.ok) {
              setCurrent("");
              setNext("");
            }
          });
        }}
      >
        <label>
          Code actuel
          <input type="password" inputMode="numeric" autoComplete="off" value={current} onChange={(e) => setCurrent(digits(e.target.value))} required />
        </label>
        <label>
          Nouveau code
          <input type="password" inputMode="numeric" autoComplete="new-password" value={next} onChange={(e) => setNext(digits(e.target.value))} required />
        </label>
        <button type="submit" className="add" disabled={pending || current.length < 6 || next.length < 6}>
          Changer le code
        </button>
      </form>
    </section>
  );
}
