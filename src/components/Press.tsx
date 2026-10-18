import { PRESS_ARTICLE } from "@/lib/press";

/** « Ils parlent de nous » : une coupure de journal sobre, épinglée sur le mur en lattes. */
export function Press() {
  const a = PRESS_ARTICLE;
  return (
    <section className="press" aria-labelledby="press-h">
      <div className="sec-h">
        <h2 id="press-h">Ils parlent de nous</h2>
      </div>
      <div className="press-wall slats">
        <figure className="clipping">
          <p className="clip-source">
            <b>{a.outlet}</b> · {a.date}
          </p>
          <p className="clip-title">{a.title}</p>
          <blockquote className="clip-quote">
            <p>«&nbsp;{a.quote}&nbsp;»</p>
          </blockquote>
          <figcaption className="clip-foot">
            Extrait de l&apos;article paru dans {a.outlet}.
            {a.url && (
              <>
                {" "}
                <a href={a.url} target="_blank" rel="noopener">
                  Lire l&apos;article
                </a>
              </>
            )}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
