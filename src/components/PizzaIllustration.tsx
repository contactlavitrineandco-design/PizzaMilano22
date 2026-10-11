import type { ReactNode } from "react";
import type { Category } from "@/lib/types";

/**
 * Illustration de remplacement d'une pizza, dessinée à partir de ses
 * ingrédients réels (texte de la carte). Ce n'est pas une photo et elle
 * est toujours affichée avec la mention « Illustration ».
 * Rendu déterministe : la même pizza donne toujours le même dessin.
 */

type Topping =
  | "olive"
  | "champignon"
  | "jambon"
  | "saumon"
  | "hache"
  | "merguez"
  | "chorizo"
  | "poulet"
  | "thon"
  | "poivron"
  | "oignon"
  | "oeuf"
  | "patate"
  | "lardon"
  | "chevre"
  | "bleu"
  | "brie"
  | "parmesan"
  | "fondu"
  | "boursin"
  | "tomate-cerise"
  | "herbe"
  | "origan";

const KEYWORDS: [RegExp, Topping, number][] = [
  [/olive/, "olive", 8],
  [/champignon/, "champignon", 7],
  [/jambon/, "jambon", 6],
  [/saumon/, "saumon", 6],
  [/viande hach/, "hache", 9],
  [/merguez/, "merguez", 7],
  [/chorizo/, "chorizo", 8],
  [/poulet/, "poulet", 7],
  [/thon/, "thon", 7],
  [/poivron/, "poivron", 7],
  [/oignon/, "oignon", 7],
  [/(œuf|oeuf)/, "oeuf", 2],
  [/pomme de terre/, "patate", 8],
  [/lardon/, "lardon", 9],
  [/ch[eè]vre/, "chevre", 6],
  [/bleu/, "bleu", 5],
  [/brie/, "brie", 4],
  [/parmesan/, "parmesan", 9],
  [/(reblochon|raclette)/, "fondu", 5],
  [/boursin/, "boursin", 7],
  [/tomates? cerises?/, "tomate-cerise", 6],
  [/(basilic|persil)/, "herbe", 7],
  [/origan/, "origan", 14],
];

const C = {
  crust: "#d89a52",
  crustEdge: "#a8672a",
  crustLight: "#e9b878",
  tomato: "#bf3626",
  cream: "#efe2c2",
  mozza: "#f7efd8",
  box: "#c9a676",
  boxDark: "#a9844f",
  boxLine: "#b8935f",
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

function drawTopping(t: Topping, x: number, y: number, rot: number, base: string, k: number): ReactNode {
  const tr = `translate(${r1(x)} ${r1(y)}) rotate(${Math.round(rot)}) scale(1.35)`;
  switch (t) {
    case "olive":
      return (
        <g key={k} transform={tr}>
          <circle r="6.5" fill="#211b18" />
          <circle r="2.6" fill={base} />
        </g>
      );
    case "champignon":
      return (
        <g key={k} transform={tr}>
          <path d="M-9 1 Q-9 -9 0 -9 Q9 -9 9 1 Z" fill="#dcc7a8" stroke="#8f7152" strokeWidth="1.2" />
          <rect x="-3" y="1" width="6" height="7" rx="2" fill="#e8d8bf" stroke="#8f7152" strokeWidth="1.2" />
        </g>
      );
    case "jambon":
      return <rect key={k} transform={tr} x="-11" y="-8" width="22" height="16" rx="5" fill="#e59a9a" stroke="#c57272" strokeWidth="1" />;
    case "saumon":
      return (
        <g key={k} transform={tr}>
          <path d="M-15 -3 Q-8 -10 2 -6 Q12 -9 15 -1 Q9 7 -1 5 Q-11 9 -15 -3 Z" fill="#f2937a" stroke="#d9705a" strokeWidth="1" />
          <path d="M-9 -4 Q-7 0 -8 4 M-2 -5 Q0 0 -1 4 M5 -5 Q7 0 6 3" fill="none" stroke="#ffd9c8" strokeWidth="1.4" />
        </g>
      );
    case "hache":
      return (
        <g key={k} transform={tr} fill="#6a3a22">
          <circle cx="-3" cy="-1" r="3.4" />
          <circle cx="3" cy="-2" r="2.8" />
          <circle cx="0" cy="3" r="3" />
        </g>
      );
    case "merguez":
      return (
        <g key={k} transform={tr}>
          <circle r="7.5" fill="#8e2a1b" />
          <circle r="5.5" fill="#b4472e" />
          <circle cx="-2" cy="-1" r="0.9" fill="#e7a07c" />
          <circle cx="2" cy="1.5" r="0.9" fill="#e7a07c" />
        </g>
      );
    case "chorizo":
      return (
        <g key={k} transform={tr}>
          <circle r="10" fill="#b8321f" stroke="#8f2214" strokeWidth="1.2" />
          <circle cx="-3" cy="-3" r="1.4" fill="#ecb19c" />
          <circle cx="3" cy="-1" r="1.1" fill="#ecb19c" />
          <circle cx="-1" cy="4" r="1.2" fill="#ecb19c" />
        </g>
      );
    case "poulet":
      return <path key={k} transform={tr} d="M-8 -5 Q-2 -8 7 -5 Q9 1 6 5 Q-2 8 -7 5 Q-10 0 -8 -5 Z" fill="#e8c9a0" stroke="#b98f5c" strokeWidth="1" />;
    case "thon":
      return (
        <g key={k} transform={tr} fill="#b9a094">
          <ellipse cx="-3" cy="0" rx="5" ry="3" />
          <ellipse cx="3" cy="-2" rx="4" ry="2.6" />
          <ellipse cx="2" cy="3" rx="3.6" ry="2.4" />
        </g>
      );
    case "poivron":
      return (
        <path
          key={k}
          transform={tr}
          d="M-9 3 Q0 -7 9 3"
          fill="none"
          stroke={k % 2 ? "#3f9a49" : "#d9452e"}
          strokeWidth="4"
          strokeLinecap="round"
        />
      );
    case "oignon":
      return <path key={k} transform={tr} d="M-10 2 Q0 -10 10 2" fill="none" stroke="#a066ad" strokeWidth="2.4" strokeLinecap="round" />;
    case "oeuf":
      return (
        <g key={k} transform={tr}>
          <path d="M-14 0 Q-13 -12 0 -12 Q14 -11 13 1 Q12 12 -1 11 Q-14 10 -14 0 Z" fill="#fffaf0" />
          <circle r="6.5" fill="#f1b02c" />
        </g>
      );
    case "patate":
      return <rect key={k} transform={tr} x="-5.5" y="-5.5" width="11" height="11" rx="3" fill="#f0d184" stroke="#c9a04a" strokeWidth="1" />;
    case "lardon":
      return (
        <g key={k} transform={tr}>
          <rect x="-7" y="-3.5" width="14" height="7" rx="2" fill="#c97665" />
          <rect x="-7" y="-0.8" width="14" height="1.6" fill="#f2d9cc" />
        </g>
      );
    case "chevre":
      return (
        <g key={k} transform={tr}>
          <circle r="11" fill="#fbfaf4" stroke="#ddd5c1" strokeWidth="2" />
          <circle r="5" fill="#f1ecdf" />
        </g>
      );
    case "bleu":
      return (
        <g key={k} transform={tr}>
          <path d="M-8 -6 L8 -7 L9 6 L-7 7 Z" fill="#f1efe6" />
          <circle cx="-3" cy="-2" r="1.3" fill="#56769a" />
          <circle cx="3" cy="1" r="1.1" fill="#56769a" />
          <circle cx="-1" cy="4" r="1" fill="#56769a" />
        </g>
      );
    case "brie":
      return <path key={k} transform={tr} d="M0 -12 L10 8 L-10 8 Z" fill="#f5e6bf" stroke="#d6bb82" strokeWidth="1.6" strokeLinejoin="round" />;
    case "parmesan":
      return <rect key={k} transform={tr} x="-5" y="-1.4" width="10" height="2.8" rx="1" fill="#f3e4ad" />;
    case "fondu":
      return <ellipse key={k} transform={tr} rx="17" ry="10" fill="#f3d888" opacity="0.88" />;
    case "boursin":
      return (
        <g key={k} transform={tr}>
          <circle r="6.5" fill="#fffaf0" />
          <circle cx="-2" cy="-1" r="0.8" fill="#5b8a3c" />
          <circle cx="2" cy="1.5" r="0.8" fill="#5b8a3c" />
        </g>
      );
    case "tomate-cerise":
      return (
        <g key={k} transform={tr}>
          <circle r="8.5" fill="#d8332a" />
          <ellipse cx="0" cy="0" rx="5.5" ry="4" fill="#ef6650" />
          <circle cx="-2" cy="0" r="0.9" fill="#f8d36a" />
          <circle cx="2" cy="0" r="0.9" fill="#f8d36a" />
        </g>
      );
    case "herbe":
      return <ellipse key={k} transform={tr} rx="5.5" ry="2.6" fill="#3f8a3a" />;
    case "origan":
      return <circle key={k} transform={tr} r="1.4" fill="#5d7434" />;
  }
}

export function PizzaIllustration({
  name,
  description,
  category,
}: {
  name: string;
  description: string;
  category: Category;
}) {
  const text = description.toLowerCase();
  const rand = rng(hash(name));
  const base = category === "creme" ? C.cream : C.tomato;
  const found = KEYWORDS.filter(([re]) => re.test(text));

  const R = 82; // rayon de la garniture
  const golden = Math.PI * (3 - Math.sqrt(5));

  // Fromage fondu de base
  const mozza: ReactNode[] = [];
  if (/mozzarella/.test(text)) {
    const n = 7;
    const off = rand() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const rr = R * 0.92 * Math.sqrt((i + 0.5) / n);
      const a = off + i * golden;
      mozza.push(
        <ellipse
          key={`m${i}`}
          cx={r1(200 + rr * Math.cos(a))}
          cy={r1(150 + rr * Math.sin(a))}
          rx={r1(15 + rand() * 6)}
          ry={r1(10 + rand() * 5)}
          transform={`rotate(${Math.round(rand() * 180)} ${r1(200 + rr * Math.cos(a))} ${r1(150 + rr * Math.sin(a))})`}
          fill={C.mozza}
          opacity={category === "creme" ? 0.75 : 0.9}
        />,
      );
    }
  }

  // Garnitures : on répartit tous les morceaux sur une spirale régulière
  const layerOrder: Topping[] = ["fondu", "brie", "chevre", "bleu", "boursin"];
  const scattered: Topping[] = [];
  const herbs: Topping[] = [];
  let eggs = 0;
  for (const [, t, count] of found) {
    if (t === "oeuf") eggs = count;
    else if (t === "herbe" || t === "origan") for (let i = 0; i < count; i++) herbs.push(t);
    else for (let i = 0; i < count; i++) scattered.push(t);
  }
  // mélange déterministe
  for (let i = scattered.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [scattered[i], scattered[j]] = [scattered[j]!, scattered[i]!];
  }
  scattered.sort((a, b) => {
    const ia = layerOrder.indexOf(a);
    const ib = layerOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const burrata = /burrata/.test(text);
  const toppings: ReactNode[] = [];
  const n = scattered.length;
  const off = rand() * Math.PI * 2;
  const skipCenter = eggs > 0 || burrata ? 0.32 : 0;
  scattered.forEach((t, i) => {
    const frac = (i + 0.5) / n;
    const rr = R * Math.sqrt(skipCenter + (1 - skipCenter) * frac);
    const a = off + i * golden * 1.0003;
    toppings.push(drawTopping(t, 200 + rr * Math.cos(a), 150 + rr * Math.sin(a), rand() * 360, base, i));
  });

  const center: ReactNode[] = [];
  if (burrata) {
    center.push(
      <g key="burrata">
        <circle cx="200" cy="150" r="27" fill="#fffdf5" stroke="#e9e1cc" strokeWidth="2" />
        <ellipse cx="192" cy="141" rx="9" ry="5" fill="#ffffff" opacity="0.9" />
      </g>,
    );
  }
  for (let i = 0; i < eggs; i++) {
    const a = (i / Math.max(1, eggs)) * Math.PI * 2 + rand();
    center.push(drawTopping("oeuf", 200 + 20 * Math.cos(a), 150 + 20 * Math.sin(a), rand() * 360, base, 900 + i));
  }

  const herbNodes = herbs.map((t, i) => {
    const rr = R * Math.sqrt(rand());
    const a = rand() * Math.PI * 2;
    return drawTopping(t, 200 + rr * Math.cos(a), 150 + rr * Math.sin(a), rand() * 360, base, 500 + i);
  });

  const honey = /miel/.test(text) ? (
    <path
      d="M138 118 Q160 100 178 122 T218 120 T258 128 M150 168 Q172 150 192 172 T234 170 T262 176"
      fill="none"
      stroke="#e0a22a"
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.9"
    />
  ) : null;

  const tilt = Math.round((rand() - 0.5) * 8);

  return (
    <svg className="illus" viewBox="0 0 400 300" role="img" aria-label={`Illustration de la pizza ${name.replace(/^La /, "")}`}>
      <rect width="400" height="300" fill="#1c1917" />
      {Array.from({ length: 17 }, (_, i) => (
        <rect key={i} x={i * 24} y="0" width="17" height="300" fill="#2a221d" />
      ))}
      <g transform={`rotate(${tilt} 200 150) translate(200 150) scale(1.12) translate(-200 -150)`}>
        <rect x="72" y="22" width="256" height="256" rx="6" fill={C.boxDark} />
        <rect x="80" y="30" width="240" height="240" rx="4" fill={C.box} />
        <path d="M80 30 L104 54 M320 30 L296 54 M80 270 L104 246 M320 270 L296 246" stroke={C.boxLine} strokeWidth="2" />
        <circle cx="200" cy="154" r="104" fill="#000" opacity="0.18" />
        <circle cx="200" cy="150" r="104" fill={C.crust} />
        <circle cx="200" cy="150" r="104" fill="none" stroke={C.crustEdge} strokeWidth="3" />
        <circle cx="200" cy="150" r="97" fill="none" stroke={C.crustLight} strokeWidth="3" opacity="0.6" />
        <circle cx="200" cy="150" r="90" fill={base} />
        {mozza}
        {toppings}
        {center}
        {honey}
        {herbNodes}
      </g>
    </svg>
  );
}
