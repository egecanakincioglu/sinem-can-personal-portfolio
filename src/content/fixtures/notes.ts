import type { NoteRecord } from '../notes/types';

/* ------------------------------------------------------------------------------------------------
   DEVELOPMENT FIXTURES. `fixture: true` on every record.
   Loaded only when NODE_ENV === "development" (lib/notes.ts); never part of the public build, the
   archive, sitemap or the homepage. They exist to exercise every block type of the article template.
   The content is neutral textbook mechanics — it is NOT Sinem's writing and is never attributed to her.
   ------------------------------------------------------------------------------------------------ */

const r = String.raw;

const beam: NoteRecord = {
  id: 'fx-beam',
  status: 'published',
  approved: true,
  fixture: true,
  featured: true,
  published: '2026-10-31',
  updated: '2026-10-31',
  relatedIds: ['fx-units'],
  en: {
    slug: 'sample-simply-supported-beam',
    title: 'A simply supported beam, from load to deflection',
    subtitle: 'Development sample: one worked beam problem that exercises every block of the article template.',
    summary:
      'Reactions, bending moment and midspan deflection of a beam under a point load, with the assumptions written down.',
    category: 'Strength of materials',
    tags: ['beam theory', 'deflection'],
    coverAlt: '',
    blocks: [
      {
        type: 'p',
        text: 'A beam problem is short to state and easy to get quietly wrong. This sample works one through, from the free-body diagram to a number, and keeps every assumption visible next to the result.[^shear] The method follows the standard Euler–Bernoulli treatment [@gere].',
      },
      { type: 'h2', id: 'setup', text: 'The setup' },
      {
        type: 'p',
        text: 'A straight, prismatic beam of span $L$ rests on a pin at $A$ and a roller at $B$. A single point load $P$ acts at midspan, as in [[beam]]. The question: what do the supports carry, and how far does the beam sag?',
      },
      { type: 'figure', id: 'beam', figureId: 'beam' },
      {
        type: 'callout',
        kind: 'assumption',
        title: 'Assumptions',
        paragraphs: [
          'The material is linear elastic and homogeneous, and the beam is prismatic.',
          'Plane sections remain plane; deflections are small compared with the span.',
        ],
      },
      {
        type: 'quote',
        text: 'Plane sections remain plane and perpendicular to the neutral axis.',
        cite: 'The Euler–Bernoulli assumption',
      },
      { type: 'h2', id: 'equations', text: 'Equations' },
      { type: 'h3', id: 'reactions', text: 'Reactions and moment' },
      {
        type: 'p',
        text: 'Symmetry splits the load between the supports. Summing moments about $A$ gives the same result, which is a useful check:',
      },
      { type: 'math', id: 'react', tex: r`R_\mathrm{A} = R_\mathrm{B} = \frac{P}{2}` },
      { type: 'p', text: 'The bending moment peaks under the load:' },
      { type: 'math', id: 'moment', tex: r`M_\mathrm{max} = \frac{P\,L}{4}` },
      { type: 'h3', id: 'deflection', text: 'Deflection' },
      { type: 'p', text: 'For a rectangle of width $b$ and height $h$ the second moment of area is' },
      { type: 'math', id: 'inertia', tex: r`I = \frac{b\,h^{3}}{12}` },
      { type: 'p', text: 'and integrating the beam equation with $E I$ constant gives the midspan deflection:' },
      { type: 'math', id: 'defl', tex: r`\delta_\mathrm{max} = \frac{P\,L^{3}}{48\,E\,I}` },
      { type: 'pullquote', text: 'A formula is only as good as the assumptions written beside it.' },
      { type: 'h4', id: 'bending-stress', text: 'Bending stress' },
      { type: 'p', text: 'The extreme-fibre stress follows from the moment, using $c = h/2$:' },
      { type: 'math', id: 'stress', tex: r`\sigma_\mathrm{max} = \frac{M_\mathrm{max}\,c}{I}` },
      { type: 'h2', id: 'numbers', text: 'Putting numbers in' },
      {
        type: 'p',
        text: 'Take a steel strip with the values in [[params]]. Equation [[defl]] then gives $\\delta_\\mathrm{max} = 6.25\\,\\mathrm{mm}$, and [[stress]] gives $\\sigma_\\mathrm{max} = 75.0\\,\\mathrm{MPa}$.',
      },
      {
        type: 'table',
        id: 'params',
        caption: 'Inputs and results of the worked example.',
        head: ['Quantity', 'Symbol', 'Value', 'Unit', 'Source'],
        align: ['l', 'l', 'r', 'l', 'l'],
        rows: [
          ['Span', '$L$', '1000', 'mm', 'assumed'],
          ['Point load', '$P$', '100', 'N', 'assumed'],
          ["Young's modulus", '$E$', '200 000', 'N/mm²', 'typical for steel'],
          ['Section, width × height', '$b \\times h$', '20 × 10', 'mm', 'assumed'],
          ['Second moment of area', '$I$', '1666.7', 'mm⁴', '[[inertia]]'],
          ['Midspan deflection', '$\\delta_\\mathrm{max}$', '6.25', 'mm', '[[defl]]'],
          ['Peak bending stress', '$\\sigma_\\mathrm{max}$', '75.0', 'MPa', '[[stress]]'],
        ],
        note: 'Values are illustrative and not measured.',
      },
      { type: 'p', text: 'The same arithmetic as a short script, which is handy for sweeping parameters:' },
      {
        type: 'code',
        lang: 'python',
        filename: 'beam.py',
        code: 'P, L = 100.0, 1000.0   # N, mm\nE = 200e3              # N/mm^2\nb, h = 20.0, 10.0      # mm\n\nI = b * h**3 / 12\ndelta = P * L**3 / (48 * E * I)\nprint(f"{delta:.2f} mm")   # 6.25 mm',
      },
      {
        type: 'image',
        id: 'plot',
        image: {
          src: '/images/fixtures/note-sample-plot.svg',
          alt: 'Straight line of midspan deflection against load: 6.25 millimetres at 100 newtons.',
          width: 800,
          height: 480,
        },
        caption: 'Midspan deflection grows linearly with load in the elastic range, computed from the equation above.',
      },
      { type: 'h2', id: 'limits', text: 'Limits of the model' },
      {
        type: 'callout',
        kind: 'limitation',
        title: 'Where it stops being valid',
        paragraphs: [
          'Short, deep beams: shear deformation is no longer negligible.',
          'Large deflections or yielding: the linear model no longer holds.',
        ],
      },
      { type: 'p', text: 'Before trusting the number, check three things:' },
      {
        type: 'ol',
        items: [
          'Does the span-to-depth ratio justify neglecting shear?',
          'Is the peak stress well below yield for the chosen material?',
          'Does the deflection satisfy the **small-deflection** assumption, roughly $\\delta \\ll L$?',
        ],
      },
      {
        type: 'ul',
        items: [
          'Reactions: check $\\Sigma F_y = 0$.',
          'Moment: check at a second section.',
          'Units: *N and mm throughout*, or convert once, at the start.',
        ],
      },
      {
        type: 'callout',
        kind: 'note',
        title: 'More reading',
        paragraphs: [
          'The derivation is on [Wikipedia](https://en.wikipedia.org/wiki/Euler%E2%80%93Bernoulli_beam_theory), and a fuller treatment is in [@beer] and [@gere].',
        ],
      },
    ],
    footnotes: [
      {
        id: 'shear',
        text: 'Shear deformation is neglected. For slender beams, with span at least ten times the depth, its effect is small.',
      },
    ],
    references: [
      { id: 'gere', text: 'Gere, J. M. and Goodno, B. J. *Mechanics of Materials*. Cengage Learning.' },
      {
        id: 'beer',
        text: 'Beer, F. P., Johnston, E. R. Jr., DeWolf, J. T. and Mazurek, D. F. *Mechanics of Materials*. McGraw-Hill Education.',
      },
    ],
    revisions: [{ rev: 'A', date: '2026-10-31', text: 'Development sample created for layout testing.' }],
  },
  tr: {
    slug: 'ornek-basit-mesnetli-kiris',
    title: 'Basit mesnetli kiriş: yükten sehime',
    subtitle: 'Geliştirme örneği: makale şablonunun her bloğunu deneyen tek bir kiriş problemi.',
    summary:
      'Noktasal yük altındaki kirişin tepkileri, eğilme momenti ve orta nokta sehimi; varsayımlar açıkça yazılmış olarak.',
    category: 'Mukavemet',
    tags: ['kiriş teorisi', 'sehim'],
    coverAlt: '',
    blocks: [
      {
        type: 'p',
        text: 'Kiriş problemi anlatması kısa, sessizce yanlış yapması kolay bir problemdir. Bu örnek, serbest cisim diyagramından bir sayıya kadar tek bir kirişi çözer ve her varsayımı sonucun yanında görünür tutar.[^shear] Yöntem, standart Euler–Bernoulli yaklaşımını izler [@gere].',
      },
      { type: 'h2', id: 'setup', text: 'Kurulum' },
      {
        type: 'p',
        text: "$L$ açıklığındaki, doğru ve prizmatik bir kiriş, $A$'da bir sabit mesnete, $B$'de bir hareketli mesnete oturur. Orta noktada tek bir $P$ noktasal yükü etki eder; bkz. [[beam]]. Soru şudur: mesnetler neyi taşır ve kiriş ne kadar sehim yapar?",
      },
      { type: 'figure', id: 'beam', figureId: 'beam' },
      {
        type: 'callout',
        kind: 'assumption',
        title: 'Varsayımlar',
        paragraphs: [
          'Malzeme doğrusal elastik ve homojendir; kiriş prizmatiktir.',
          'Düzlem kesitler düzlem kalır; sehimler açıklığa göre küçüktür.',
        ],
      },
      {
        type: 'quote',
        text: 'Düzlem kesitler düzlem kalır ve tarafsız eksene dik kalır.',
        cite: 'Euler–Bernoulli varsayımı',
      },
      { type: 'h2', id: 'equations', text: 'Denklemler' },
      { type: 'h3', id: 'reactions', text: 'Tepkiler ve moment' },
      {
        type: 'p',
        text: 'Simetri, yükü mesnetler arasında eşit böler. $A$ noktasına göre moment toplamı aynı sonucu verir; bu da yararlı bir kontroldür:',
      },
      { type: 'math', id: 'react', tex: r`R_\mathrm{A} = R_\mathrm{B} = \frac{P}{2}` },
      { type: 'p', text: 'Eğilme momenti yükün altında en büyük değerine ulaşır:' },
      { type: 'math', id: 'moment', tex: r`M_\mathrm{max} = \frac{P\,L}{4}` },
      { type: 'h3', id: 'deflection', text: 'Sehim' },
      { type: 'p', text: '$b$ genişliğinde ve $h$ yüksekliğinde bir dikdörtgen için atalet momenti:' },
      { type: 'math', id: 'inertia', tex: r`I = \frac{b\,h^{3}}{12}` },
      { type: 'p', text: '$E I$ sabitken kiriş denklemi integre edilince orta nokta sehimi bulunur:' },
      { type: 'math', id: 'defl', tex: r`\delta_\mathrm{max} = \frac{P\,L^{3}}{48\,E\,I}` },
      { type: 'pullquote', text: 'Bir formül, yanına yazılan varsayımlar kadar güvenilirdir.' },
      { type: 'h4', id: 'bending-stress', text: 'Eğilme gerilmesi' },
      { type: 'p', text: 'En dış lifteki gerilme, $c = h/2$ alınarak momentten bulunur:' },
      { type: 'math', id: 'stress', tex: r`\sigma_\mathrm{max} = \frac{M_\mathrm{max}\,c}{I}` },
      { type: 'h2', id: 'numbers', text: 'Sayıları yerine koymak' },
      {
        type: 'p',
        text: '[[params]] içindeki değerlerle çelik bir şerit alalım. [[defl]] numaralı denklem $\\delta_\\mathrm{max} = 6.25\\,\\mathrm{mm}$, [[stress]] numaralı denklem $\\sigma_\\mathrm{max} = 75.0\\,\\mathrm{MPa}$ verir.',
      },
      {
        type: 'table',
        id: 'params',
        caption: 'Çözülen örneğin girdileri ve sonuçları.',
        head: ['Büyüklük', 'Simge', 'Değer', 'Birim', 'Kaynak'],
        align: ['l', 'l', 'r', 'l', 'l'],
        rows: [
          ['Açıklık', '$L$', '1000', 'mm', 'varsayım'],
          ['Noktasal yük', '$P$', '100', 'N', 'varsayım'],
          ['Elastisite modülü', '$E$', '200 000', 'N/mm²', 'çelik için tipik'],
          ['Kesit, genişlik × yükseklik', '$b \\times h$', '20 × 10', 'mm', 'varsayım'],
          ['Atalet momenti', '$I$', '1666,7', 'mm⁴', '[[inertia]]'],
          ['Orta nokta sehimi', '$\\delta_\\mathrm{max}$', '6,25', 'mm', '[[defl]]'],
          ['En büyük eğilme gerilmesi', '$\\sigma_\\mathrm{max}$', '75,0', 'MPa', '[[stress]]'],
        ],
        note: 'Değerler örnek amaçlıdır; ölçülmemiştir.',
      },
      { type: 'p', text: 'Aynı hesap kısa bir betik olarak; parametre taramak için kullanışlıdır:' },
      {
        type: 'code',
        lang: 'python',
        filename: 'kiris.py',
        code: 'P, L = 100.0, 1000.0   # N, mm\nE = 200e3              # N/mm^2\nb, h = 20.0, 10.0      # mm\n\nI = b * h**3 / 12\ndelta = P * L**3 / (48 * E * I)\nprint(f"{delta:.2f} mm")   # 6.25 mm',
      },
      {
        type: 'image',
        id: 'plot',
        image: {
          src: '/images/fixtures/note-sample-plot.svg',
          alt: 'Orta nokta sehiminin yüke göre doğrusal grafiği: 100 newtonda 6,25 milimetre.',
          width: 800,
          height: 480,
        },
        caption: 'Elastik bölgede orta nokta sehimi yükle doğrusal artar; yukarıdaki denklemden hesaplanmıştır.',
      },
      { type: 'h2', id: 'limits', text: 'Modelin sınırları' },
      {
        type: 'callout',
        kind: 'limitation',
        title: 'Geçerliliğin bittiği yer',
        paragraphs: [
          'Kısa ve yüksek kirişler: kayma şekil değiştirmesi artık ihmal edilemez.',
          'Büyük sehimler veya akma: doğrusal model artık geçerli değildir.',
        ],
      },
      { type: 'p', text: 'Sayıya güvenmeden önce üç şeye bakın:' },
      {
        type: 'ol',
        items: [
          'Açıklık/yükseklik oranı kaymayı ihmal etmeyi haklı çıkarıyor mu?',
          'En büyük gerilme, seçilen malzemenin akma sınırının hayli altında mı?',
          'Sehim, kabaca $\\delta \\ll L$ olacak şekilde **küçük sehim** varsayımını sağlıyor mu?',
        ],
      },
      {
        type: 'ul',
        items: [
          'Tepkiler: $\\Sigma F_y = 0$ kontrolü.',
          'Moment: ikinci bir kesitte kontrol.',
          'Birimler: *baştan sona N ve mm*, ya da yalnızca başta bir kez dönüştürme.',
        ],
      },
      {
        type: 'callout',
        kind: 'note',
        title: 'Ek okuma',
        paragraphs: [
          'Türetme [Wikipedia](https://en.wikipedia.org/wiki/Euler%E2%80%93Bernoulli_beam_theory) sayfasında; daha kapsamlı anlatım [@beer] ve [@gere] içindedir.',
        ],
      },
    ],
    footnotes: [
      {
        id: 'shear',
        text: 'Kayma şekil değiştirmesi ihmal edilmiştir. Açıklığı yüksekliğinin en az on katı olan narin kirişlerde etkisi küçüktür.',
      },
    ],
    references: [
      { id: 'gere', text: 'Gere, J. M. ve Goodno, B. J. *Mechanics of Materials*. Cengage Learning.' },
      {
        id: 'beer',
        text: 'Beer, F. P., Johnston, E. R. Jr., DeWolf, J. T. ve Mazurek, D. F. *Mechanics of Materials*. McGraw-Hill Education.',
      },
    ],
    revisions: [{ rev: 'A', date: '2026-10-31', text: 'Yerleşim denemesi için geliştirme örneği oluşturuldu.' }],
  },
};

/** Single-language sample (Turkish only): exercises the language status and the language switch fallback. */
const units: NoteRecord = {
  id: 'fx-units',
  status: 'published',
  approved: true,
  fixture: true,
  published: '2026-10-12',
  tr: {
    slug: 'ornek-birimler-ve-boyut-analizi',
    title: 'Birimler ve boyut analizi',
    summary: 'Bir sonucu yazmadan önce birimlerini yazmak: kısa bir geliştirme örneği.',
    category: 'Mühendislik temelleri',
    tags: ['birimler'],
    blocks: [
      {
        type: 'p',
        text: 'Bir hesabın sonucu, birimi yanlışsa yanlıştır. Kısa bir kontrol: $F = m\\,a$ için $\\mathrm{kg}\\cdot\\mathrm{m}/\\mathrm{s}^{2} = \\mathrm{N}$.',
      },
      { type: 'h2', id: 'check', text: 'Kontrol' },
      { type: 'p', text: 'Her denklemin iki tarafının birimi aynı olmalıdır.' },
    ],
  },
};

/** Never public: a draft, and a published-but-unapproved record. Used to verify they return 404. */
const draft: NoteRecord = {
  id: 'fx-draft',
  status: 'draft',
  approved: true,
  fixture: true,
  published: '2026-10-30',
  en: {
    slug: 'sample-draft',
    title: 'Draft sample',
    summary: 'Must never resolve.',
    blocks: [{ type: 'p', text: 'Draft.' }],
  },
  tr: {
    slug: 'ornek-taslak',
    title: 'Taslak örnek',
    summary: 'Asla açılmamalı.',
    blocks: [{ type: 'p', text: 'Taslak.' }],
  },
};
const unapproved: NoteRecord = {
  id: 'fx-unapproved',
  status: 'published',
  approved: false,
  fixture: true,
  published: '2026-10-29',
  en: {
    slug: 'sample-unapproved',
    title: 'Unapproved sample',
    summary: 'Must never resolve.',
    blocks: [{ type: 'p', text: 'Unapproved.' }],
  },
};

/** @public Loaded by path in development. */
export const fixtureNotes: NoteRecord[] = [beam, units, draft, unapproved];

/** Eight more samples, to show the archive's topic filter (appears from eight notes). */
const topics: [string, string][] = [
  ['Statics', 'Statik'],
  ['Strength of materials', 'Mukavemet'],
  ['Manufacturing', 'İmalat'],
];
/** @public Loaded by path in development. */
export const manyFixtureNotes: NoteRecord[] = Array.from({ length: 8 }, (_, i) => ({
  id: `fx-many-${i + 1}`,
  status: 'published' as const,
  approved: true,
  fixture: true,
  published: `2026-09-${String(28 - i * 3).padStart(2, '0')}`,
  en: {
    slug: `sample-note-${i + 1}`,
    title: `Development sample ${i + 1}`,
    summary: 'A development sample for the archive layout.',
    category: topics[i % 3][0],
    blocks: [{ type: 'p' as const, text: 'Sample.' }],
  },
  tr: {
    slug: `ornek-not-${i + 1}`,
    title: `Geliştirme örneği ${i + 1}`,
    summary: 'Arşiv yerleşimi için bir geliştirme örneği.',
    category: topics[i % 3][1],
    blocks: [{ type: 'p' as const, text: 'Örnek.' }],
  },
}));
