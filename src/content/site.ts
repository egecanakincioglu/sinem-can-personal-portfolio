import {
  cachedMonthYear as monthYear,
  cachedNum as num,
  cachedPeriodText as periodText,
  capFirst,
  fill,
  lower,
  numberWord,
} from '@/lib/format';
import { BEAM_REFERENCE_A, beamMaxMidspanOffset } from '@/lib/physics';
import type {
  Activity,
  Copy,
  EducationEntry,
  ExperienceEntry,
  ForceRecord,
  Language,
  Locale,
  Membership,
  Platform,
  Process,
  SkillGroup,
  SummaryRow,
} from './types';

// Central content layer. Pages read only through the getters at the bottom, so a later
// Supabase-backed implementation replaces this file and nothing else.
// Only verified facts live here. Nothing is invented.
//
// ONE SOURCE PER FACT. Everything below the "records" section is derived:
//   identity            -> ownerName
//   education[dogus]    -> program, stage, university, graduationMonth, force F3, summary rows
//   education[imkb]     -> force F1, summary row
//   experience[0]       -> internship*, force F6, summary row
//   memberships[0]      -> force F4, summary row
//   skillGroups/languages -> summary rows
//   forceRecords.length -> influence count words
//   lastRevision        -> copyright year
// A derived value renders exactly what the former literal rendered.

const both = (fn: (l: Locale) => string): Copy => ({ tr: fn('tr'), en: fn('en') });

// ---- Identity and contact -------------------------------------------------------------------

export const identity = { firstName: 'Sinem', lastName: 'CAN' };
export const ownerName = `${identity.firstName} ${identity.lastName}`;

/** Social destinations, in display order. Instagram and Threads are visible by default (OI-5) and
 *  become individually configurable in the Admin through `show`. LinkedIn is the primary CTA. */
export const platforms: Platform[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/in/sinemcan0180/',
    show: { contact: true, footer: true },
  },
  {
    id: 'instagram',
    name: 'Instagram',
    url: 'https://www.instagram.com/sinemcan._/',
    handle: '@sinemcan._',
    show: { contact: true, footer: true },
  },
  {
    id: 'threads',
    name: 'Threads',
    url: 'https://www.threads.com/@sinemcan._',
    handle: '@sinemcan._',
    show: { contact: true, footer: true },
  },
];
const platform = (id: Platform['id']) => platforms.find((p) => p.id === id)!;

export const contact = {
  email: 'sinemcan0180@hotmail.com',
  platforms,
  // Aliases derived from `platforms`; kept so existing consumers keep working.
  linkedin: platform('linkedin').url,
  instagram: platform('instagram').url,
  threads: platform('threads').url,
  handle: platform('instagram').handle!,
};

/** Footer revision date. Copyright year derives from it. */
export const lastRevision = '2026-10-31';

// ---- Records (authoritative biographical facts) ---------------------------------------------

export const interests: Copy[] = [
  { tr: 'Otomotiv', en: 'Automotive' },
  { tr: 'Savunma sanayii', en: 'Defense industry' },
  { tr: 'Mekanik tasarım', en: 'Mechanical design' },
  { tr: 'İmalat', en: 'Manufacturing' },
];

export const applied: Process[] = [
  {
    name: { tr: 'Tornalama', en: 'Turning' },
    note: { tr: 'İş parçası döner, kesici ilerler.', en: 'The workpiece rotates while the cutter feeds.' },
  },
  {
    name: { tr: 'Frezeleme', en: 'Milling' },
    note: { tr: 'Kesici döner, iş parçası ilerler.', en: 'The cutter rotates while the workpiece feeds.' },
  },
  {
    name: { tr: 'Delme', en: 'Drilling' },
    note: { tr: 'Dönen uç, parçada delik açar.', en: 'A rotating bit cuts a hole in the part.' },
  },
  {
    name: { tr: 'Hassas ölçüm', en: 'Precision measurement' },
    note: {
      tr: 'Ölçü, çizimdeki toleransla karşılaştırılır.',
      en: "A measurement is checked against the drawing's tolerance.",
    },
  },
];

export const observed: Process[] = [
  {
    name: { tr: 'Metal döküm', en: 'Metal casting' },
    note: { tr: 'Sıvı metal kalıba dökülür ve katılaşır.', en: 'Liquid metal is poured into a mold and solidifies.' },
  },
  {
    name: { tr: 'CNC sac şekillendirme', en: 'CNC sheet metal forming' },
    note: {
      tr: 'Sac, sayısal denetimli makinede biçimlenir.',
      en: 'Sheet is shaped on a numerically controlled machine.',
    },
  },
  {
    name: { tr: 'Dövme', en: 'Forging' },
    note: { tr: 'Metal basınçla biçimlendirilir.', en: 'Metal is shaped under compressive force.' },
  },
  {
    name: { tr: 'Kaynak', en: 'Welding' },
    note: { tr: 'İki parça ısıyla birleştirilir.', en: 'Two parts are joined using heat.' },
  },
];

export const academicInterests: Copy[] = [
  { tr: 'Mukavemet', en: 'Strength of materials' },
  { tr: 'Mühendislik mekaniği', en: 'Engineering mechanics' },
  { tr: 'Deneysel mühendislik', en: 'Experimental engineering' },
  { tr: 'Elektrik temelleri', en: 'Electrical fundamentals' },
  { tr: 'CAD tabanlı tasarım', en: 'CAD-based design' },
  { tr: 'Malzeme testleri', en: 'Materials testing' },
  { tr: 'Deformasyon ölçümü', en: 'Deformation measurement' },
  { tr: 'Devre arıza tespiti', en: 'Circuit fault finding' },
];

// ---- Profile page records. Verified facts only; no course names, no invented levels. ----
export const education: EducationEntry[] = [
  {
    id: 'dogus',
    institution: { tr: 'Doğuş Üniversitesi', en: 'Doğuş University' },
    program: { tr: 'Makine Mühendisliği', en: 'Mechanical Engineering' },
    stage: { tr: 'Son sınıf', en: 'Senior year' },
    period: { start: '2022-10', end: '2027-07', precision: 'month', expected: true },
  },
  {
    id: 'imkb',
    institution: { tr: 'Adana İMKB Fen Lisesi', en: 'Adana IMKB Science High School' },
    period: { start: '2017', end: '2021', precision: 'year' },
    score: 92.77,
  },
];

export const experience: ExperienceEntry[] = [
  {
    id: 'ferre-femas',
    organization: 'Ferre | Femas Group',
    role: { tr: 'Makine Mühendisliği Stajyeri', en: 'Mechanical Engineering Intern' },
    month: '2026-08-01',
    duration: { tr: '1 ay', en: '1 month' },
    place: { tr: 'Kayseri', en: 'Kayseri' },
    applied,
    observed,
  },
];

export const memberships: Membership[] = [
  {
    id: 'ieee-ras',
    organization: 'IEEE Robotics and Automation Society',
    abbr: 'IEEE RAS',
    team: { tr: 'koordinasyon ekibi', en: 'coordination team' },
    role: { tr: 'Koordinasyon ekibi üyesi', en: 'Coordination team member' },
    period: { start: '2022', end: '2023', precision: 'year' },
    text: {
      tr: 'İki RASTAGE zirvesinin organizasyonuna katkı.',
      en: 'Contributed to organizing two RASTAGE summits.',
    },
  },
];

/** Context is given only where it is known (e.g. precision measurement: internship). `summary` flags the
 *  items the recruiter summary lists; its defaults reproduce the former literal rows. */
export const skillGroups: SkillGroup[] = [
  {
    id: 'cad',
    name: { tr: 'Tasarım ve CAD', en: 'Design and CAD' },
    items: [
      { name: { tr: 'SolidWorks', en: 'SolidWorks' }, summary: 'tool' },
      { name: { tr: 'Siemens NX', en: 'Siemens NX' }, summary: 'tool' },
      { name: { tr: 'Fusion 360', en: 'Fusion 360' }, summary: 'tool' },
      { name: { tr: 'AutoCAD', en: 'AutoCAD' }, summary: 'tool' },
      { name: { tr: '3B CAD tasarım', en: '3D CAD design' } },
    ],
  },
  {
    id: 'compute',
    name: { tr: 'Hesaplama', en: 'Computation' },
    items: [
      { name: { tr: 'MATLAB', en: 'MATLAB' }, summary: 'tool' },
      { name: { tr: 'Python', en: 'Python' }, summary: 'tool' },
    ],
  },
  {
    id: 'shop',
    name: { tr: 'Atölye ve kalite', en: 'Workshop and quality' },
    items: [
      {
        name: { tr: 'Hassas ölçüm', en: 'Precision measurement' },
        context: { tr: 'staj', en: 'internship' },
        summary: 'competency',
      },
      { name: { tr: 'Kalite kontrol', en: 'Quality control' }, summary: 'competency' },
      {
        name: { tr: 'İmalat süreçleri', en: 'Manufacturing processes' },
        context: { tr: 'staj', en: 'internship' },
        summary: 'competency',
      },
    ],
  },
  {
    id: 'lab',
    name: { tr: 'Laboratuvar', en: 'Laboratory' },
    items: [
      {
        name: { tr: 'Mühendislik laboratuvar çalışması', en: 'Engineering laboratory work' },
        summary: 'competency',
        summaryName: { tr: 'laboratuvar çalışması', en: 'laboratory work' },
      },
    ],
  },
];

export const languages: Language[] = [
  {
    id: 'en',
    name: { tr: 'İngilizce', en: 'English' },
    level: { tr: 'Profesyonel çalışma düzeyi', en: 'Professional working proficiency' },
    short: { tr: 'profesyonel çalışma düzeyi', en: 'professional working' },
  },
  {
    id: 'de',
    name: { tr: 'Almanca', en: 'German' },
    level: { tr: 'Başlangıç düzeyi', en: 'Elementary' },
    short: { tr: 'başlangıç', en: 'elementary' },
  },
  { id: 'tr', name: { tr: 'Türkçe', en: 'Turkish' }, level: null },
];

export const activities: Activity[] = [
  {
    id: 'volleyball',
    name: { tr: 'Voleybol takımı', en: 'Volleyball team' },
    period: { start: '2017', end: '2018', precision: 'year' },
  },
  {
    id: 'badminton',
    name: { tr: 'Badminton takımı', en: 'Badminton team' },
    period: { start: '2018', end: '2020', precision: 'year' },
  },
  {
    id: 'tournament',
    name: { tr: 'Okul badminton turnuvası ikinciliği', en: 'Runner-up, school badminton tournament' },
  },
];

/** CV download is shown only if Sinem supplies a file. */
export const cvPdf: { href: string; sizeKb: number } | null = null;

// ---- Derived facts ---------------------------------------------------------------------------

/** The canonical records every derived fact below is computed from. Profile editing (Admin) replaces them as a set;
 *  `deriveFacts(records)` then recomputes the facts, so nothing is copied into a second state. */
export type Records = {
  identity: typeof identity;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  memberships: Membership[];
  skillGroups: SkillGroup[];
  languages: Language[];
  interests: Copy[];
};
export const baseRecords: Records = { identity, education, experience, memberships, skillGroups, languages, interests };
/**
 * Ids that other facts depend on (F1, F3, F4, F6, summary rows, hero glance). They cannot be removed.
 * @public Used by the editor to block removing core records.
 */
export const CORE_IDS = {
  education: ['dogus', 'imkb'],
  experience: ['ferre-femas'],
  memberships: ['ieee-ras'],
} as const;
const FORCE_COUNT = 6;

function core(r: Records) {
  return {
    dogus: r.education.find((e) => e.id === 'dogus')!,
    imkb: r.education.find((e) => e.id === 'imkb')!,
    ferre: r.experience.find((e) => e.id === 'ferre-femas')!,
    ieee: r.memberships.find((m) => m.id === 'ieee-ras')!,
  };
}

export const copyrightYear = lastRevision.slice(0, 4);

export const beam = {
  /** Default load position a0, in units of L (= BEAM_REFERENCE_A in physics.ts). */
  defaultLoad: BEAM_REFERENCE_A,
  /** Future editable range for the default, inclusive. */
  minLoad: 0,
  maxLoad: 1,
  /** Drawn deflection exaggeration, % of the span (BeamFigure layouts: desktop / compact). */
  deflectionScale: { desktop: 3.5, compact: 5 },
};

/** Labels shared by the hero glance and the recruiter summary. */
export const labels = {
  program: { tr: 'Bölüm', en: 'Program' },
  university: { tr: 'Üniversite', en: 'University' },
  graduation: { tr: 'Beklenen mezuniyet', en: 'Expected graduation' },
  highSchool: { tr: 'Lise', en: 'High school' },
} satisfies Record<string, Copy>;

/** Static facts as `{token}` values. Dictionary and draft copy are filled from this (see fillCopy). */
export function tokensFor(r: Records, l: Locale): Record<string, string> {
  const { dogus, ferre } = core(r);
  const count = FORCE_COUNT;
  return {
    name: `${r.identity.firstName} ${r.identity.lastName}`,
    program: dogus.program![l],
    programLc: lower(dogus.program![l], l),
    university: dogus.institution[l],
    grad: monthYear(`${dogus.period.end}-01`, l),
    internMonth: monthYear(ferre.month, l),
    org: ferre.organization,
    place: ferre.place[l],
    role: ferre.role[l],
    duration: ferre.duration[l],
    year: copyrightYear,
    count: numberWord(count, l),
    Count: capFirst(numberWord(count, l), l),
    interests: r.interests.map((i) => lower(i[l], l)).join(', '),
    offset: num(beamMaxMidspanOffset(), l, 3),
    scaleDesktop: num(beam.deflectionScale.desktop, l, 1),
    scaleMobile: num(beam.deflectionScale.compact, l, 0),
  };
}
export const tokens = (l: Locale) => tokensFor(baseRecords, l);

const fillWith = <T extends Copy>(c: T, r: Records): T => ({
  ...c,
  tr: fill(c.tr, tokensFor(r, 'tr')),
  en: fill(c.en, tokensFor(r, 'en')),
});

/** Fills the static tokens in both languages; runtime tokens ({n} {deg} {a} {a0} {ra} {rb}) stay in place. {a0} is runtime on purpose: the edited default load must reach the Reset label. */
export const fillCopy = <T extends Copy>(c: T): T => fillWith(c, baseRecords);

/** Representative biographical vectors. Conceptual, never measured forces.
 *  Exactly six records; R and its angle are computed in lib/physics.ts, never typed.
 *  Title and period of linked records come from those records. */
export const buildForceRecords = (r: Records): ForceRecord[] => {
  const { dogus, imkb, ferre, ieee } = core(r);
  const graduationMonth = `${dogus.period.end}-01`;
  const internshipMonth = ferre.month;
  const programCopy = dogus.program!,
    stageCopy = dogus.stage!,
    universityCopy = dogus.institution;
  return [
    {
      id: 'F1',
      magnitude: 1.0,
      angleDeg: 8,
      short: labels.highSchool,
      period: both((l) => periodText(imkb.period, l)),
      title: imkb.institution,
      text: both((l) =>
        l === 'tr' ? `Mezuniyet puanı ${num(imkb.score!, l)}/100.` : `Graduated with ${num(imkb.score!, l)}/100.`,
      ),
    },
    {
      id: 'F2',
      magnitude: 0.45,
      angleDeg: 62,
      short: { tr: 'Takım sporları', en: 'Team sports' },
      period: { tr: '2017 – 2020', en: '2017 – 2020' },
      title: { tr: 'Voleybol ve badminton takımları', en: 'Volleyball and badminton teams' },
      text: { tr: 'Okul badminton turnuvasında ikincilik.', en: 'Runner-up at the school badminton tournament.' },
    },
    {
      id: 'F3',
      magnitude: 1.25,
      angleDeg: 18,
      short: { tr: 'Doğuş', en: 'Doğuş' },
      period: both((l) => periodText(dogus.period, l)),
      title: both((l) => `${universityCopy[l]}, ${programCopy[l]}`),
      text: both((l) => `${stageCopy[l]}; ${lower(labels.graduation[l], l)} ${monthYear(graduationMonth, l)}.`),
    },
    {
      id: 'F4',
      magnitude: 0.55,
      angleDeg: 70,
      short: { tr: ieee.abbr!, en: ieee.abbr! },
      period: both((l) => periodText(ieee.period, l)),
      title: { tr: ieee.organization, en: ieee.organization },
      text: {
        tr: 'Koordinasyon ekibi üyesi; iki RASTAGE zirvesinin organizasyonuna katkı.',
        en: 'Coordination team member; contributed to organizing two RASTAGE summits.',
      },
    },
    {
      id: 'F5',
      magnitude: 0.7,
      angleDeg: -12,
      short: { tr: 'Laboratuvar ve CAD', en: 'Lab and CAD' },
      period: { tr: 'Ders süreci', en: 'Coursework' },
      title: { tr: 'Laboratuvar çalışması ve CAD', en: 'Laboratory work and CAD' },
      text: {
        tr: 'Mühendislik laboratuvarı ve CAD tabanlı tasarım.',
        en: 'Engineering laboratory work and CAD-based design.',
      },
    },
    {
      id: 'F6',
      magnitude: 0.8,
      angleDeg: 34,
      short: { tr: 'Staj', en: 'Internship' },
      period: both((l) => monthYear(internshipMonth, l)),
      title: { tr: ferre.organization, en: ferre.organization },
      text: {
        tr: `Bir aylık ${lower(programCopy.tr, 'tr')} stajı, ${ferre.place.tr}.`,
        en: `One-month ${lower(programCopy.en, 'en')} internship, ${ferre.place.en}.`,
      },
    },
  ];
};
export const forceRecords: ForceRecord[] = buildForceRecords(baseRecords);

const joinNames = (xs: Copy[], l: Locale) => xs.map((x) => x[l]).join(', ');

/** Recruiter summary, computed from the records. Turkish is listed without a proficiency label
 *  until Sinem confirms. */
export const buildSummaryRows = (r: Records): SummaryRow[] => {
  const { dogus, imkb, ferre, ieee } = core(r);
  const graduationMonth = `${dogus.period.end}-01`;
  const internshipMonth = ferre.month;
  const programCopy = dogus.program!,
    stageCopy = dogus.stage!,
    universityCopy = dogus.institution;
  const languages = r.languages;
  const summaryItems = (kind: 'tool' | 'competency') =>
    r.skillGroups.flatMap((g) => g.items).filter((i) => i.summary === kind);
  return [
    { label: labels.program, value: both((l) => `${programCopy[l]}, ${lower(stageCopy[l], l)}`) },
    { label: labels.university, value: universityCopy },
    { label: labels.graduation, value: both((l) => monthYear(graduationMonth, l)) },
    { label: labels.highSchool, value: both((l) => `${imkb.institution[l]}, ${num(imkb.score!, l)}/100`) },
    {
      label: { tr: 'Son deneyim', en: 'Latest experience' },
      value: both((l) => `${ferre.organization}, ${monthYear(internshipMonth, l)}`),
    },
    {
      label: { tr: 'Topluluk', en: 'Community' },
      value: both((l) => `${ieee.abbr}, ${ieee.team![l]}, ${periodText(ieee.period, l)}`),
    },
    {
      label: { tr: 'Araçlar', en: 'Tools' },
      value: both((l) =>
        joinNames(
          summaryItems('tool').map((i) => i.name),
          l,
        ),
      ),
    },
    {
      label: { tr: 'Yetkinlik', en: 'Competencies' },
      value: both((l) =>
        summaryItems('competency')
          .map((i, n) => {
            const s = (i.summaryName ?? i.name)[l];
            return n === 0 ? s : lower(s, l);
          })
          .join(', '),
      ),
    },
    {
      label: { tr: 'Diller', en: 'Languages' },
      value: both((l) => languages.map((g) => (g.short ? `${g.name[l]} (${g.short[l]})` : g.name[l])).join(', ')),
    },
  ];
};
export const summaryRows: SummaryRow[] = buildSummaryRows(baseRecords);

/** Draft copy whose text embeds record facts: re-filled from the records whenever they change. */
const draftTemplates = {
  profileLead: {
    tr: "{university}'nde {programLc} okuyan son sınıf öğrencisiyim.",
    en: "I'm a senior {programLc} student at {university}.",
    approved: false,
  },
  profileBody: {
    tr: "Mukavemeti ve mühendislik mekaniğini laboratuvarda ve atölyede, ölçerek ve sınayarak öğrenmeye çalışıyorum. {internMonth}'da {place}'de bir aylık staj yaptım; atölyede bazı süreçleri uyguladım, bazılarını gözlemledim. İlgi duyduğum alanlar otomotiv, savunma sanayii, mekanik tasarım ve imalat.",
    en: "I try to learn strength of materials and engineering mechanics by measuring and testing, in the lab and on the shop floor. In {internMonth} I completed a one-month internship in {place}, where I applied some workshop processes and observed others. I'm drawn to automotive, the defense industry, mechanical design and manufacturing.",
    approved: false,
  },
  introBody: {
    tr: "{internMonth}'da {place}'de {org}'ta bir aylık makine mühendisliği stajı yaptım. Atölyede tornalama, frezeleme, delme ve hassas ölçümü uyguladım; döküm, sac şekillendirme, dövme ve kaynağı ise gözlemledim.",
    en: 'In {internMonth} I completed a one-month mechanical engineering internship at {org} in {place}. In the workshop I applied turning, milling, drilling and precision measurement, and I observed casting, sheet forming, forging and welding.',
    approved: false,
  },
  beamTeaching: {
    tr: 'En büyük çökme yükün tam altında oluşmaz. Yük nereye konursa konsun, açıklık ortasına en fazla ≈{offset} L uzaklıkta kalır.',
    en: "The largest deflection doesn't occur right under the load. Wherever the load sits, it stays within ≈{offset} L of midspan.",
    approved: true, // standard beam-theory result, verifiable
  },
} satisfies Record<string, Copy>;
export const fillDraft = (r: Records) => ({
  profileLead: fillWith(draftTemplates.profileLead, r),
  profileBody: fillWith(draftTemplates.profileBody, r),
  introBody: fillWith(draftTemplates.introBody, r),
  beamTeaching: fillWith(draftTemplates.beamTeaching, r),
});

// ---- Draft personal-voice copy. `approved: false` until Sinem signs off. ----
export const draft = {
  ...fillDraft(baseRecords), // profileLead, profileBody, introBody, beamTeaching (token-filled from the records)
  academicIntro: {
    tr: 'Akademik ilgi alanlarım arasında mukavemet ve mühendislik mekaniği var; tam liste aşağıda.',
    en: 'My academic interests include strength of materials and engineering mechanics; the full list is below.',
    approved: false,
  },
  academicNote: {
    tr: 'Mukavemet, bir parçanın yük altında kırılmadan ve aşırı şekil değiştirmeden dayanıp dayanamayacağını inceler.',
    en: 'Strength of materials asks whether a part can carry a load without breaking or deforming excessively.',
    approved: false,
  },
  experienceIntro: {
    tr: 'Staj boyunca uyguladığım süreçlerle yalnızca gözlemlediklerimi bilerek ayrı listeledim.',
    en: "I've deliberately kept what I applied during the internship apart from what I only observed.",
    approved: false,
  },
  rastageNote: {
    tr: "RASTAGE, üniversite düzeyinde düzenlenen Robotik ve Otomasyon Zirvesi'dir.",
    en: 'RASTAGE is a university-level Robotics and Automation Summit.',
    approved: false,
  },
  offField: {
    tr: 'Voleybol ve badminton takımlarında yer aldım; bir okul badminton turnuvasında ikinci oldum.',
    en: 'I played on volleyball and badminton teams, and came second at a school badminton tournament.',
    approved: false,
  },
  teamSportNote: {
    tr: 'Takım sporu, ekip içinde rol almayı öğretti.',
    en: 'Team sports taught me to take a role within a group.',
    approved: false,
  },
  heroLead: {
    tr: 'Bir parçayı anlamak için önce ona etki eden her şeye bakarım.',
    en: 'To understand a part, I start with everything acting on it.',
    approved: false,
  },
  isolationNote: {
    tr: 'Serbest cisim diyagramı, bir cismi çevresinden ayırıp ona etki eden kuvvetleri gösterir. Bu site de aynısını yapıyor: beni ve beni şekillendirenleri.',
    en: 'A free-body diagram isolates a body and shows every force acting on it. This site does the same, with me and what has shaped me.',
    approved: false,
  },
  statement: {
    tr: 'Makine mühendisliğini; parçaların yükü nasıl taşıdığı, nasıl üretildiği ve nasıl ölçüldüğü üzerinden öğreniyorum.',
    en: 'I learn mechanical engineering through how parts carry load, how they are made and how they are measured.',
    approved: false,
  },
  introNote: {
    tr: 'Uyguladığım ve gözlemlediğim süreçleri Atölye bölümünde ayrı ayrı listeledim.',
    en: 'I list what I applied and what I observed separately in the Workshop section.',
    approved: false,
  },
  forcesText: {
    tr: 'Statikte serbest cisim dengededir, ΣF = 0. Burada denge çizmedim: sıfırdan farklı bir bileşke hareketi değil, hızın değiştiğini, yani ivmelenmeyi (ΣF = m·a) anlatır. Durağan bir denge değil; değişen bir yön.',
    en: "In statics a free body is in equilibrium, ΣF = 0. I deliberately did not draw equilibrium: a non-zero resultant doesn't mean motion, it means a changing velocity, or acceleration (ΣF = m·a). Not a static balance; a changing direction.",
    approved: false,
  },
  openness: {
    tr: 'Staj ve yeni mezun fırsatları için görüşmeye açığım.',
    en: "I'm open to talking about internships and new-graduate opportunities.",
    approved: false,
  },
};

export const getForceRecords = (): ForceRecord[] => forceRecords;
export const getEducation = (): EducationEntry[] => education;
export const getExperience = (): ExperienceEntry[] => experience;
export const getMemberships = (): Membership[] => memberships;
export const getSkillGroups = (): SkillGroup[] => skillGroups;
export const getLanguages = (): Language[] => languages;
export const getActivities = (): Activity[] => activities;
