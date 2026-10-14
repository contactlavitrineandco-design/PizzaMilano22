"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { prepareImage, type PreparedImage } from "@/lib/image-prep";
import { defaultProductAlt, GALLERY_SECTIONS, imageUrl, isPizza, PHOTO_BUCKET } from "@/lib/images";
import { CATEGORIES } from "@/lib/menu";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { Category, GalleryPhoto, GallerySection, ImageSource, Product } from "@/lib/types";
import {
  addGalleryPhoto,
  deleteGalleryPhoto,
  discardUpload,
  moveGalleryPhoto,
  removeProductPhoto,
  setGalleryPhotoPublished,
  setProductPhoto,
  updateGalleryPhoto,
  type PhotoActionResult,
} from "./actions";

type Target =
  | { kind: "product"; product: Product }
  | { kind: "gallery-new" }
  | { kind: "gallery-edit"; photo: GalleryPhoto };

const SOURCE_LABELS: Record<ImageSource, string> = {
  restaurant: "Photo prise chez Pizza Milano",
  illustration: "Image d'illustration (ne vient pas du restaurant)",
};

export function PhotoManager({ products, gallery }: { products: Product[]; gallery: GalleryPhoto[] }) {
  const router = useRouter();
  const [cat, setCat] = useState<Category>("tomate");
  const [target, setTarget] = useState<Target | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, startTransition] = useTransition();

  function showToast(m: string) {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  function run(key: string, action: () => Promise<PhotoActionResult>, success: string) {
    setBusy(key);
    startTransition(async () => {
      const res = await action();
      setBusy(null);
      setConfirmDelete(null);
      showToast(res.ok ? success : res.message);
      if (res.ok) router.refresh();
    });
  }

  const list = products.filter((p) => p.category === cat);
  const withPhoto = products.filter((p) => p.image_path).length;
  const pizzas = products.filter(isPizza);
  const pizzasWithRealPhoto = pizzas.filter((p) => p.image_path && p.image_source === "restaurant").length;

  return (
    <main>
      <div className="wrap pro">
        <div className="pro-head">
          <h1>Photos</h1>
          <Link href="/pizzeria" className="ghost adm-link">
            Retour aux commandes
          </Link>
        </div>

        <div className="stats">
          <div className="stat">
            <span>Produits avec photo</span>
            <b className="num">
              {withPhoto}/{products.length}
            </b>
          </div>
          <div className="stat">
            <span>Pizzas en vraie photo</span>
            <b className="num">
              {pizzasWithRealPhoto}/{pizzas.length}
            </b>
          </div>
          <div className="stat">
            <span>Photos de la galerie</span>
            <b className="num">{gallery.length}</b>
          </div>
          <div className="stat">
            <span>Masquées</span>
            <b className="num">{gallery.filter((g) => !g.published).length}</b>
          </div>
        </div>

        {/* ---------------- Carte ---------------- */}
        <section className="stock" aria-labelledby="adm-menu">
          <h2 id="adm-menu">Photos de la carte</h2>
          <p>
            Sans photo, une pizza affiche un emplacement neutre. Ajoutez vos vraies photos : elles remplacent
            aussi les « Photos d&apos;illustration » générées.
          </p>
          <div className="tabs" role="group" aria-label="Rubriques">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" aria-pressed={c.id === cat} onClick={() => setCat(c.id)}>
                {c.name}
              </button>
            ))}
          </div>
          <div className="adm-grid">
            {list.map((p) => {
              const status = p.image_path
                ? p.image_source === "restaurant"
                  ? "Vraie photo"
                  : "Photo d'illustration"
                : "Pas de photo";
              return (
                <article className="item adm-card" key={p.id}>
                  <div className="item-photo">
                    {p.image_path ? (
                      <AdminThumb path={p.image_path} alt={p.image_alt || defaultProductAlt(p)} />
                    ) : (
                      <PhotoPlaceholder />
                    )}
                    <span className="ph-badge">{status}</span>
                  </div>
                  <h3>{p.name}</h3>
                  <p className="ing">{p.description}</p>
                  <div className="adm-actions">
                    <button type="button" className="add" onClick={() => setTarget({ kind: "product", product: p })}>
                      {p.image_path ? "Remplacer / modifier" : "Ajouter une photo"}
                    </button>
                    {p.image_path &&
                      (confirmDelete === p.id ? (
                        <button
                          type="button"
                          className="adm-danger"
                          disabled={busy === p.id}
                          onClick={() => run(p.id, () => removeProductPhoto(p.id), `Photo retirée : ${p.name}`)}
                        >
                          Confirmer
                        </button>
                      ) : (
                        <button type="button" className="ghost" onClick={() => setConfirmDelete(p.id)}>
                          Supprimer
                        </button>
                      ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ---------------- Galerie ---------------- */}
        <section className="stock" aria-labelledby="adm-gallery">
          <div className="adm-head">
            <div>
              <h2 id="adm-gallery">Galerie « Découvrez notre pizzeria »</h2>
              <p>Affichée sur la page d&apos;accueil, dans cet ordre. Une photo masquée reste ici mais n&apos;est plus visible des clients.</p>
            </div>
            <button type="button" className="add" onClick={() => setTarget({ kind: "gallery-new" })}>
              Ajouter une photo
            </button>
          </div>
          {gallery.length === 0 ? (
            <div className="col-empty">Aucune photo. La section est cachée sur le site tant qu&apos;elle est vide.</div>
          ) : (
            <div className="adm-grid">
              {gallery.map((g, i) => (
                <article className={`item adm-card${g.published ? "" : " off"}`} key={g.id}>
                  <div className="item-photo adm-tall">
                    <AdminThumb path={g.image_path} alt={g.alt} />
                    <span className="ph-badge">
                      {g.source === "restaurant" ? "Vraie photo" : "Photo d'illustration"}
                      {g.published ? "" : " · masquée"}
                    </span>
                  </div>
                  <h3>{g.caption || "Sans légende"}</h3>
                  <p className="ing">{GALLERY_SECTIONS.find((s) => s.id === g.section)?.name}</p>
                  <div className="adm-actions">
                    <button type="button" className="add" onClick={() => setTarget({ kind: "gallery-edit", photo: g })}>
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      disabled={busy === g.id}
                      onClick={() =>
                        run(g.id, () => setGalleryPhotoPublished(g.id, !g.published), g.published ? "Photo masquée" : "Photo publiée")
                      }
                    >
                      {g.published ? "Masquer" : "Publier"}
                    </button>
                    <button
                      type="button"
                      className="ghost adm-icon"
                      aria-label="Avancer dans l'ordre"
                      disabled={i === 0 || busy === g.id}
                      onClick={() => run(g.id, () => moveGalleryPhoto(g.id, "up"), "Ordre modifié")}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className="ghost adm-icon"
                      aria-label="Reculer dans l'ordre"
                      disabled={i === gallery.length - 1 || busy === g.id}
                      onClick={() => run(g.id, () => moveGalleryPhoto(g.id, "down"), "Ordre modifié")}
                    >
                      →
                    </button>
                    {confirmDelete === g.id ? (
                      <button
                        type="button"
                        className="adm-danger"
                        disabled={busy === g.id}
                        onClick={() => run(g.id, () => deleteGalleryPhoto(g.id), "Photo supprimée")}
                      >
                        Confirmer
                      </button>
                    ) : (
                      <button type="button" className="ghost" onClick={() => setConfirmDelete(g.id)}>
                        Supprimer
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {target && (
        <PhotoDialog
          key={target.kind === "product" ? target.product.id : target.kind === "gallery-edit" ? target.photo.id : "new"}
          target={target}
          onClose={() => setTarget(null)}
          onDone={(message) => {
            setTarget(null);
            showToast(message);
            router.refresh();
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Fenêtre d'ajout / remplacement avec aperçu avant publication        */
/* ------------------------------------------------------------------ */

function PhotoDialog({
  target,
  onClose,
  onDone,
}: {
  target: Target;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const isProduct = target.kind === "product";
  const existingPath =
    target.kind === "product" ? target.product.image_path : target.kind === "gallery-edit" ? target.photo.image_path : null;

  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [alt, setAlt] = useState(() =>
    target.kind === "product"
      ? target.product.image_alt || defaultProductAlt(target.product)
      : target.kind === "gallery-edit"
        ? target.photo.alt
        : "",
  );
  const [source, setSource] = useState<ImageSource>(() =>
    target.kind === "product"
      ? (target.product.image_source ?? "restaurant")
      : target.kind === "gallery-edit"
        ? target.photo.source
        : "restaurant",
  );
  const [caption, setCaption] = useState(target.kind === "gallery-edit" ? target.photo.caption : "");
  const [section, setSection] = useState<GallerySection>(target.kind === "gallery-edit" ? target.photo.section : "interieur");

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  useEffect(() => () => {
    if (prepared) URL.revokeObjectURL(prepared.previewUrl);
  }, [prepared]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPreparing(true);
    try {
      const img = await prepareImage(file);
      setPrepared((old) => {
        if (old) URL.revokeObjectURL(old.previewUrl);
        return img;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo illisible.");
    } finally {
      setPreparing(false);
    }
  }

  async function publish() {
    setError(null);
    if (!prepared && !existingPath) return setError("Choisissez une photo sur votre appareil.");
    if (!alt.trim()) return setError("Décrivez la photo en quelques mots (texte lu par les malvoyants et Google).");
    setSaving(true);
    let uploaded: string | null = null;
    try {
      if (prepared) {
        const supabase = createBrowserSupabase();
        if (!supabase) throw new Error("Configuration Supabase manquante.");
        const folder = isProduct ? "products" : "gallery";
        uploaded = `${folder}/${crypto.randomUUID()}.${prepared.ext}`;
        const { error: upError } = await supabase.storage.from(PHOTO_BUCKET).upload(uploaded, prepared.blob, {
          contentType: prepared.contentType,
          cacheControl: "31536000",
          upsert: false,
        });
        if (upError) {
          uploaded = null;
          throw new Error("L'envoi de la photo a échoué. Vérifiez la connexion et que vous êtes connecté en admin.");
        }
      }

      const res =
        target.kind === "product"
          ? await setProductPhoto({ productId: target.product.id, path: uploaded, alt, source })
          : target.kind === "gallery-new"
            ? await addGalleryPhoto({ path: uploaded!, alt, caption, section, source })
            : await updateGalleryPhoto(target.photo.id, { path: uploaded, alt, caption, section, source });

      if (!res.ok) throw new Error(res.message);
      onDone(target.kind === "product" ? `Photo enregistrée : ${target.product.name}` : "Galerie mise à jour");
    } catch (e) {
      if (uploaded) void discardUpload(uploaded);
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
      setSaving(false);
    }
  }

  const title =
    target.kind === "product"
      ? `Photo : ${target.product.name}`
      : target.kind === "gallery-new"
        ? "Nouvelle photo de la pizzeria"
        : "Modifier la photo";

  const previewSrc = prepared?.previewUrl ?? (existingPath ? imageUrl(existingPath) : null);

  return (
    <dialog ref={ref} className="adm-dialog" aria-label={title} onClose={onClose}>
      <h2>{title}</h2>

      <div className={`adm-preview${isProduct ? "" : " adm-tall"}`}>
        {previewSrc ? (
          <Image src={previewSrc} alt="Aperçu" fill sizes="600px" unoptimized={!!prepared} />
        ) : (
          <div className="ph-missing">{preparing ? "Préparation…" : "Aucune photo choisie"}</div>
        )}
        {prepared && <span className="ph-badge">Aperçu · pas encore publiée</span>}
      </div>
      {isProduct && <p className="adm-hint">Cadrage tel qu&apos;il apparaîtra sur la carte (format 4:3).</p>}

      <div className="field">
        <label htmlFor="ph-file">{existingPath ? "Remplacer par une autre photo" : "Photo"}</label>
        <input
          id="ph-file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          disabled={preparing || saving}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>

      <fieldset className="adm-radio">
        <legend>Origine de l&apos;image</legend>
        {(Object.keys(SOURCE_LABELS) as ImageSource[]).map((s) => (
          <label key={s}>
            <input type="radio" name="ph-source" value={s} checked={source === s} onChange={() => setSource(s)} />{" "}
            {SOURCE_LABELS[s]}
          </label>
        ))}
      </fieldset>

      {!isProduct && (
        <>
          <div className="field">
            <label htmlFor="ph-section">Rubrique</label>
            <select id="ph-section" value={section} onChange={(e) => setSection(e.target.value as GallerySection)}>
              {GALLERY_SECTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ph-caption">Légende (facultatif)</label>
            <input
              id="ph-caption"
              maxLength={120}
              placeholder="Ex. Le four, en plein service"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
        </>
      )}

      <div className="field">
        <label htmlFor="ph-alt">Description de l&apos;image</label>
        <textarea
          id="ph-alt"
          rows={2}
          maxLength={200}
          value={alt}
          placeholder="Ex. Pizza reine avec jambon et champignons, vue de dessus"
          onChange={(e) => setAlt(e.target.value)}
        />
      </div>

      {error && (
        <div className="err" role="alert">
          {error}
        </div>
      )}

      <div className="adm-actions">
        <button type="button" className="cta" disabled={saving || preparing} onClick={publish}>
          {saving ? "Publication…" : "Publier"}
        </button>
        <button type="button" className="ghost" disabled={saving} onClick={onClose}>
          Annuler
        </button>
      </div>
    </dialog>
  );
}

/** Vignette admin : signale clairement un fichier introuvable au lieu d'une image cassée. */
function AdminThumb({ path, alt }: { path: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="ph-missing">Fichier introuvable : remplacez la photo</div>;
  return <Image src={imageUrl(path)} alt={alt} fill sizes="260px" onError={() => setFailed(true)} />;
}
