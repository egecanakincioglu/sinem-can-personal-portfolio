import type { ReactNode } from 'react';
import type { Locale } from '../types';

type Localized = Record<Locale, string>;

export type FigureEntry = {
  id: string;
  viewBox: string;
  Component: () => ReactNode;
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

const entries: FigureEntry[] = [
  {
    id: 'beam',
    viewBox: '0 0 600 200',
    Component: BeamFigure,
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
