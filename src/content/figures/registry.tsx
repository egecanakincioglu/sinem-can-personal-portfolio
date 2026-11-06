import type { ReactNode } from 'react';
import type { Locale } from '../types';

type Localized = Record<Locale, string>;

export type FigureEntry = {
  id: string;
  viewBox: string;
  Component: () => ReactNode;
  /** Optional phone composition, shown below 768px instead of the default one. */
  compact?: { viewBox: string; Component: () => ReactNode };
  alt: Localized;
  /** Default caption. Plain text with optional bold: no footnote or cross-reference markup. */
  caption: Localized;
};

/** Simply supported beam, point load at midspan. Uses the site's line classes. */
function BeamFigure() {
  return (
    <g>
      <line x1="70" y1="22" x2="530" y2="22" className="svg-thin" />
      <line x1="70" y1="14" x2="70" y2="84" className="svg-thin" />
      <line x1="530" y1="14" x2="530" y2="84" className="svg-thin" />
      <polygon points="70,22 81,18.5 81,25.5" className="fill-grafit" />
      <polygon points="530,22 519,18.5 519,25.5" className="fill-grafit" />
      <text x="300" y="15" textAnchor="middle" fontSize="19" className="svg-text">
        L
      </text>
      <line x1="300" y1="44" x2="300" y2="78" className="svg-red" />
      <polygon points="300,89 296,76 304,76" className="fill-red" />
      <text x="313" y="62" fontSize="21" className="svg-text" style={{ fill: 'var(--color-kirmizi)' }}>
        P
      </text>
      <line x1="70" y1="90" x2="530" y2="90" className="svg-heavy" />
      <path d="M70 90 L62 109 H78 Z" className="svg-heavy" />
      <path d="M57 117H83 M62 117l-3 5 M70 117l-3 5 M78 117l-3 5" className="svg-thin" />
      <path d="M530 90 L522 107 H538 Z" className="svg-heavy" />
      <circle cx="526" cy="110" r="2.6" className="svg-thin" />
      <circle cx="534" cy="110" r="2.6" className="svg-thin" />
      <path d="M517 115H543" className="svg-thin" />
      <path d="M70 90 C190 138 410 138 530 90" className="svg-ghost" />
      <line x1="300" y1="94" x2="300" y2="124" className="svg-thin" />
      <line x1="293" y1="126" x2="307" y2="126" className="svg-thin" />
      <text x="311" y="116" fontSize="19" className="svg-text">
        δ
      </text>
      <line x1="70" y1="178" x2="70" y2="136" className="svg-heavy" />
      <polygon points="70,128 66,141 74,141" className="fill-grafit" />
      <text x="82" y="166" fontSize="19" className="svg-text">
        R
        <tspan dy="5" fontSize="13" fontStyle="normal">
          A
        </tspan>
      </text>
      <line x1="530" y1="178" x2="530" y2="136" className="svg-heavy" />
      <polygon points="530,128 526,141 534,141" className="fill-grafit" />
      <text x="542" y="166" fontSize="19" className="svg-text">
        R
        <tspan dy="5" fontSize="13" fontStyle="normal">
          B
        </tspan>
      </text>
    </g>
  );
}

/** Phone composition of the same drawing: narrower viewBox, so every label renders at 12px or more on a 360px screen. */
function BeamFigureCompact() {
  return (
    <g>
      <line x1="36" y1="22" x2="262" y2="22" className="svg-thin" />
      <line x1="36" y1="14" x2="36" y2="84" className="svg-thin" />
      <line x1="262" y1="14" x2="262" y2="84" className="svg-thin" />
      <polygon points="36,22 47,18.5 47,25.5" className="fill-grafit" />
      <polygon points="262,22 251,18.5 251,25.5" className="fill-grafit" />
      <text x="149" y="15" textAnchor="middle" fontSize="15" className="svg-text">
        L
      </text>
      <line x1="149" y1="44" x2="149" y2="78" className="svg-red" />
      <polygon points="149,89 145,76 153,76" className="fill-red" />
      <text x="160" y="62" fontSize="16" className="svg-text" style={{ fill: 'var(--color-kirmizi)' }}>
        P
      </text>
      <line x1="36" y1="90" x2="262" y2="90" className="svg-heavy" />
      <path d="M36 90 L28 109 H44 Z" className="svg-heavy" />
      <path d="M23 117H49 M28 117l-3 5 M36 117l-3 5 M44 117l-3 5" className="svg-thin" />
      <path d="M262 90 L254 107 H270 Z" className="svg-heavy" />
      <circle cx="258" cy="110" r="2.6" className="svg-thin" />
      <circle cx="266" cy="110" r="2.6" className="svg-thin" />
      <path d="M249 115H275" className="svg-thin" />
      <path d="M36 90 C95 138 203 138 262 90" className="svg-ghost" />
      <line x1="149" y1="94" x2="149" y2="124" className="svg-thin" />
      <line x1="142" y1="126" x2="156" y2="126" className="svg-thin" />
      <text x="160" y="116" fontSize="15" className="svg-text">
        δ
      </text>
      <line x1="36" y1="178" x2="36" y2="136" className="svg-heavy" />
      <polygon points="36,128 32,141 40,141" className="fill-grafit" />
      <text x="46" y="166" fontSize="15" className="svg-text">
        R
        <tspan dy="5" fontSize="13.5" fontStyle="normal">
          A
        </tspan>
      </text>
      <line x1="262" y1="178" x2="262" y2="136" className="svg-heavy" />
      <polygon points="262,128 258,141 266,141" className="fill-grafit" />
      <text x="272" y="166" fontSize="15" className="svg-text">
        R
        <tspan dy="5" fontSize="13.5" fontStyle="normal">
          B
        </tspan>
      </text>
    </g>
  );
}

const entries: FigureEntry[] = [
  {
    id: 'beam',
    viewBox: '0 0 600 200',
    Component: BeamFigure,
    compact: { viewBox: '0 0 300 200', Component: BeamFigureCompact },
    alt: {
      en: 'Simply supported beam of span L with a point load P at midspan, reactions R A and R B at the supports and the dashed deflected shape with midspan deflection delta.',
      tr: 'L açıklıklı, orta noktasında P noktasal yükü olan basit mesnetli kiriş; mesnetlerde R A ve R B tepkileri, kesikli çizgiyle gösterilen sehim şekli ve orta nokta sehimi delta.',
    },
    caption: {
      en: 'Simply supported beam with a midspan point load. The dashed curve is the deflected shape, exaggerated; **P** is the applied load.',
      tr: 'Orta noktasında noktasal yük bulunan basit mesnetli kiriş. Kesikli eğri, abartılmış sehim şeklidir; **P** uygulanan yüktür.',
    },
  },
];

const byId = new Map(entries.map((e) => [e.id, e]));

export function getFigure(id: string): FigureEntry | undefined {
  return byId.get(id);
}

export const figureIds: readonly string[] = entries.map((e) => e.id);
