import type { ImageMedia, ProjectRecord } from '../projects/types';

/* ------------------------------------------------------------------------------------------------
   DEVELOPMENT FIXTURES — SAMPLE CONTENT ONLY.
   Not real projects, not attributed to Sinem CAN. Loaded exclusively when NODE_ENV === "development"
   (see lib/projects.ts); excluded from production builds, public routes and indexing.
   ------------------------------------------------------------------------------------------------ */

/** A neutral sample drawing, generated in code so no asset file ships. Labelled as a sample inside the image. */
function sampleSvg(w: number, h: number, label: string, variant: 'plate' | 'graph') {
  const body =
    variant === 'plate'
      ? `<rect x="180" y="170" width="${w - 360}" height="${h - 340}" fill="none" stroke="#262624" stroke-width="3"/>
         <circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) * 0.14}" fill="none" stroke="#262624" stroke-width="3"/>
         <path d="M${w / 2} 120V${h - 120}M120 ${h / 2}H${w - 120}" stroke="#76776F" stroke-width="1.5" stroke-dasharray="26 6 3 6"/>
         <path d="M180 ${h - 110}H${w - 180}" stroke="#262624" stroke-width="1.5"/>`
      : `<path d="M160 ${h - 160}H${w - 160}M160 ${h - 160}V160" stroke="#262624" stroke-width="2"/>
         <path d="M160 ${h - 200}C${w * 0.35} ${h - 220} ${w * 0.45} 260 ${w - 200} 220" fill="none" stroke="#262624" stroke-width="3"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<rect width="${w}" height="${h}" fill="#f6f7f2"/>${body}
<text x="${w / 2}" y="${h - 50}" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="30" fill="#262624">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const SAMPLE = 'SAMPLE — NOT A REAL DRAWING';

const plate = (id: string, w = 1200, h = 800): ImageMedia => ({
  id,
  kind: 'drawing',
  src: sampleSvg(w, h, SAMPLE, 'plate'),
  width: w,
  height: h,
  alt: {
    tr: 'Örnek amaçlı basit bir levha çizimi: ortasında delik bulunan dikdörtgen ve eksen çizgileri.',
    en: 'A simple sample plate drawing: a rectangle with a central hole and centre lines.',
  },
  caption: {
    tr: "Örnek teknik çizim; geliştirme fixture'ıdır, gerçek bir parçayı göstermez.",
    en: 'Sample technical drawing — a development fixture, not a real part.',
  },
});

const graph = (id: string): ImageMedia => ({
  id,
  kind: 'diagram',
  src: sampleSvg(1000, 1000, SAMPLE, 'graph'),
  width: 1000,
  height: 1000,
  alt: {
    tr: 'Örnek amaçlı kare bir grafik iskeleti: iki eksen ve bir eğri.',
    en: 'A square sample graph frame: two axes and a curve.',
  },
  caption: { tr: 'Örnek grafik; veri içermez.', en: 'Sample graph — contains no data.' },
});

/** @public Loaded by path in development. */
export const fixtureProjects: ProjectRecord[] = [
  {
    id: 'fixture-a',
    fixture: true,
    visibility: 'published',
    approved: true,
    slug: { tr: 'ornek-kayit-a', en: 'sample-record-a' },
    title: { tr: 'Örnek kayıt A', en: 'Sample record A' },
    subtitle: {
      tr: 'Şablonu sınamak için kullanılan geliştirme örneği; gerçek bir proje değildir.',
      en: 'A development sample used to exercise the template — not a real project.',
    },
    kind: 'single-part',
    disciplines: ['machine-design', 'cad-modelling'],
    status: 'completed',
    context: 'independent',
    period: { start: '2026', precision: 'year' },
    featured: true,
    hero: 'figure',
    cover: plate('a-cover'),
    tools: ['Sample tool 1', 'Sample tool 2'],
    materials: [{ tr: 'Örnek malzeme', en: 'Sample material' }],
    objective: [
      {
        tr: 'Bu metin yalnızca tipografiyi ve okuma kolonunu denemek içindir. İçerik bir mühendislik iddiası taşımaz.',
        en: 'This text exists only to exercise typography and the reading column. It makes no engineering claim.',
      },
    ],
    process: [
      {
        tr: 'Süreç bölümü, birden fazla paragrafın ritmini denemek için iki kısa paragraf içerir.',
        en: 'The process section carries two short paragraphs to test the rhythm of several paragraphs.',
      },
      {
        tr: 'İkinci paragraf; satır uzunluğunu ve boşlukları değerlendirmek içindir.',
        en: 'The second paragraph is there to judge line length and spacing.',
      },
    ],
    methodology: [{ tr: 'Örnek yöntem metni.', en: 'Sample methodology text.' }],
    measurements: [
      {
        label: { tr: 'Örnek ölçü', en: 'Sample dimension' },
        value: 0,
        digits: 2,
        unit: 'mm',
        note: { tr: 'Gerçek ölçüm değildir.', en: 'Not a real measurement.' },
        verified: true,
      },
    ],
    results: [{ tr: 'Örnek sonuç paragrafı.', en: 'Sample results paragraph.' }],
    conclusions: [{ tr: 'Örnek değerlendirme paragrafı.', en: 'Sample conclusions paragraph.' }],
    figures: [plate('a-fig-1'), graph('a-fig-2'), plate('a-fig-3', 900, 1200)],
    preview3d: {
      id: 'a-3d',
      approved: true,
      poster: plate('a-3d-poster'),
      // Development-only route (app/dev-model): a synthetic flange, 404 outside `next dev`.
      modelSrc: '/dev-model/flange.glb',
      caption: {
        tr: "GELİŞTİRME ÖRNEĞİ: yazılım tarafından üretilmiş yapay bir flanş; gerçek bir parça değildir ve Sinem CAN'a ait değildir.",
        en: 'DEVELOPMENT DEMO: a synthetic flange generated in code — not a real part and not by Sinem CAN.',
      },
    },
    calculations: [
      {
        id: 'a-calc-1',
        title: { tr: 'Örnek hesap kaydı', en: 'Sample calculation record' },
        given: [{ symbol: 'x', label: { tr: 'Örnek girdi', en: 'Sample input' }, value: 0, digits: 1, unit: 'mm' }],
        required: [
          {
            tr: 'Biçimi denemek için örnek istenen büyüklük.',
            en: 'A sample required quantity, to exercise the layout.',
          },
        ],
        assumptions: [
          { tr: 'Örnek kabul bir.', en: 'Sample assumption one.' },
          { tr: 'Örnek kabul iki.', en: 'Sample assumption two.' },
        ],
        method: [
          {
            tr: 'Örnek yöntem açıklaması; gerçek bir mühendislik yöntemi değildir.',
            en: 'Sample method text — not a real engineering method.',
          },
        ],
        result: {
          symbol: 'y',
          label: { tr: 'Örnek sonuç', en: 'Sample result' },
          value: 0,
          digits: 1,
          unit: 'MPa',
          verified: true,
          note: { tr: 'Gerçek ölçüm değildir.', en: 'Not a real value.' },
        },
      },
    ],
    decisions: [
      {
        id: 'a-dec-1',
        title: { tr: 'Örnek karar kaydı', en: 'Sample decision record' },
        criteria: [
          { tr: 'Örnek ölçüt 1', en: 'Sample criterion 1' },
          { tr: 'Örnek ölçüt 2', en: 'Sample criterion 2' },
        ],
        alternatives: [
          {
            name: { tr: 'Örnek alternatif', en: 'Sample alternative' },
            evidence: [
              { tr: 'Örnek gerekçe notu.', en: 'Sample evidence note.' },
              { tr: 'Başka bir örnek not.', en: 'Another sample note.' },
            ],
          },
          {
            name: { tr: 'Seçilen örnek alternatif', en: 'Selected sample alternative' },
            selected: true,
            evidence: [{ tr: 'Örnek karşılaştırma notu.', en: 'Sample tradeoff note.' }],
          },
        ],
        rationale: {
          tr: 'Örnek gerekçe metni; gerçek bir tasarım kararı değildir.',
          en: 'Sample rationale — not a real design decision.',
        },
      },
    ],
    learnings: [
      {
        tr: 'Örnek çıkarım paragrafı; gerçek bir yansıtma değildir.',
        en: 'Sample learnings paragraph — not a real reflection.',
      },
    ],
    revisions: [
      {
        rev: 'A',
        date: '2026-01-01',
        note: { tr: 'Örnek revizyon notu.', en: 'Sample revision note.' },
        reasoning: { tr: 'Örnek gerekçe.', en: 'Sample reasoning.' },
      },
      { rev: 'B', note: { tr: 'Tarihsiz örnek revizyon.', en: 'Sample revision without a date.' } },
    ],
    relatedIds: ['fixture-b'],
    // Shape check only: shows the model carries private-original metadata without any location.
    privateOriginals: [
      {
        assetId: 'fixture-opaque-key',
        format: 'step',
        label: { tr: 'Örnek özel dosya', en: 'Sample private file' },
        access: 'private',
      },
    ],
  },
  {
    // Sparse on purpose: proves absent optional fields render nothing (no empty headings, no empty cells).
    id: 'fixture-b',
    fixture: true,
    visibility: 'published',
    approved: true,
    slug: { tr: 'ornek-kayit-b', en: 'sample-record-b' },
    title: { tr: 'Örnek kayıt B — yalnızca zorunlu alanlar', en: 'Sample record B — required fields only' },
    kind: 'calculation',
    disciplines: ['strength-of-materials'],
    status: 'in-progress',
  },
  {
    // Regression check: published record whose 3D preview is NOT approved. Its model URL, poster and the
    // private-original key must appear nowhere in the page, the RSC payload or the client bundle data.
    id: 'fixture-unapproved-3d',
    fixture: true,
    visibility: 'published',
    approved: true,
    slug: { tr: 'ornek-onaysiz-3b', en: 'sample-unapproved-3d' },
    title: { tr: 'Örnek kayıt — onaysız 3B', en: 'Sample record — unapproved 3D' },
    kind: 'single-part',
    disciplines: ['cad-modelling'],
    status: 'in-progress',
    preview3d: {
      id: 'unapproved-3d',
      approved: false,
      poster: plate('unapproved-poster'),
      modelSrc: '/dev-model/UNAPPROVED-MODEL-MARKER.glb',
    },
    privateOriginals: [
      { assetId: 'PRIVATE-ASSET-MARKER', format: 'sldprt', label: { tr: 'Özel', en: 'Private' }, access: 'private' },
    ],
  },
  {
    // Draft: must 404 everywhere, in development too.
    id: 'fixture-draft',
    fixture: true,
    visibility: 'draft',
    slug: { tr: 'ornek-taslak', en: 'sample-draft' },
    title: { tr: 'Örnek taslak', en: 'Sample draft' },
    kind: 'documentation',
    disciplines: ['manufacturing'],
    status: 'in-progress',
  },
];

/** Extra samples so the 6+ filter state can be inspected in the dev preview (?many=1). */
/** @public Loaded by path in development. */
export const manyFixtures: ProjectRecord[] = [
  ...fixtureProjects.filter((p) => p.visibility === 'published'),
  ...(['cad-assembly', 'fabrication', 'lab-experiment', 'design-study'] as const).map((kind, i): ProjectRecord => ({
    id: `fixture-extra-${i}`,
    fixture: true,
    visibility: 'published',
    approved: true,
    slug: { tr: `ornek-ek-${i}`, en: `sample-extra-${i}` },
    title: { tr: `Örnek kayıt ${'CDEF'[i]}`, en: `Sample record ${'CDEF'[i]}` },
    kind,
    disciplines: [i % 2 ? 'manufacturing' : 'materials'],
    status: i % 2 ? 'completed' : 'in-progress',
    period: { start: `${2023 + i}`, precision: 'year' },
    tools: ['Sample tool 1'],
    // one row with a cover so the desktop hover/focus preview can be inspected
    ...(i === 0 ? { cover: plate('extra-0-cover') } : {}),
  })),
];
