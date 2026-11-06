import { getSiteContent } from '@/content/site-content';
import type { NoteContent, NoteRecord } from '@/content/notes/types';
import type { ProjectRecord } from '@/content/projects/types';
import { publicLeaves, type FieldLocale, type FieldType, type RegistryEntry } from '@/lib/field-registry';
import {
  beamLoadField,
  contactFields,
  copyFields,
  forceFieldId,
  identityFields,
  interestsField,
  portraitFields,
  summaryLabelField,
  topicsField,
  workshopField,
  workViewFields,
  type CopyField,
  type CopyKey,
} from '@/lib/preview-bridge';
import { profileIds } from '@/lib/profile-fields';
import { fieldMeta } from './(workspace)/ana-sayfa/fieldMeta';
import { screens } from './screens';

/* ------------------------------------------------------------------------------------------------
   The field registry: one list of every editable field of the public site, the admin screen and editor that
   edits it, or the screen that will. Built from the three existing sources without changing them:
     - lib/preview-bridge.ts   `copyFields` and the record/field id tables (text, forces, beam, workshop, contact)
     - lib/profile-fields.ts   `profileIds` (profile records)
     - ana-sayfa/fieldMeta.ts  the Turkish labels of the text fields
   Coverage against the public content model is checked by registry.test.ts and shown at /admin/kapsam.
   ------------------------------------------------------------------------------------------------ */

/** Screens that exist only as placeholders; an entry pointing here is `planned`. */
export const plannedScreens = ['projeler', 'notlar', 'medya', 'cad-glb', 'metinler'] as const;
type PlannedScreen = (typeof plannedScreens)[number];
/** Screens that are built but still have planned fields (images other than the portrait). */
export const partlyBuiltScreens = ['medya', 'projeler'] as const;

const ALL = 'Tüm sayfalar';
const sectionLabel = (screen: string, id: string) =>
  screens.find((s) => s.slug === screen)?.sections.find((s) => s.id === id)?.label ?? id;

type Where = { page: string; section: string; screen: string; editorSection?: string };
type Opts = { label?: string; derived?: boolean };
const entries: RegistryEntry[] = [];

function ready(
  id: string,
  path: string,
  where: Where,
  type: FieldType,
  locale: FieldLocale,
  { label, derived }: Opts = {},
) {
  entries.push({ id, path, label, ...where, status: 'ready', locale, type, ...(derived ? { derived } : {}) });
}

function planned(
  id: string,
  path: string,
  where: Omit<Where, 'editorSection'> & { screen: PlannedScreen },
  type: FieldType,
  locale: FieldLocale,
  label?: string,
) {
  entries.push({ id, path, label, ...where, status: 'planned', locale, type });
}

/* ---- 1. bilingual texts (`copyFields`) ---- */

const homeSectionOf: Record<string, string> = {
  hero: 'hero',
  kisaca: 'kisaca',
  kuvvetler: 'kuvvetler',
  atolye: 'atolye',
  yaklasim: 'yaklasim',
  calismalar: 'calismalar',
  yonelim: 'yonelim',
  iletisim: 'iletisim',
  ustbilgi: 'global',
  altbilgi: 'global',
};
const profileSectionOf: Partial<Record<CopyKey, string>> = {
  profileLead: 'giris',
  profileBody: 'giris',
  profileNow: 'giris',
  profileNowValue: 'giris',
  academicIntro: 'egitim',
  academicNote: 'egitim',
  experienceIntro: 'deneyim',
  rastageNote: 'topluluk',
  offField: 'etkinlikler',
  teamSportNote: 'etkinlikler',
};
const metaPage: Record<string, string> = {
  home: 'Ana sayfa',
  profile: 'Profil',
  projects: 'Projeler',
  notes: 'Notlar',
};

const copyPath = (f: CopyField) => `${f.dest === 'draft' ? 'draft' : f.dest}.${f.key}`;

function copyWhere(key: CopyKey, f: CopyField): Where {
  const [head, second] = f.id.split('.');
  if (head === 'ayarlar') {
    return { page: metaPage[second] ?? ALL, section: 'Sayfa meta bilgisi', screen: 'ayarlar', editorSection: 'meta' };
  }
  if (head === 'profil') {
    const sec = profileSectionOf[key] ?? 'etiketler';
    return { page: 'Profil', section: sectionLabel('profil', sec), screen: 'profil', editorSection: sec };
  }
  const sec = homeSectionOf[head];
  if (head === 'ustbilgi') return { page: ALL, section: 'Üst bilgi', screen: 'ana-sayfa', editorSection: sec };
  if (head === 'altbilgi') return { page: ALL, section: 'Alt bilgi', screen: 'ana-sayfa', editorSection: sec };
  return { page: 'Ana sayfa', section: sectionLabel('ana-sayfa', sec), screen: 'ana-sayfa', editorSection: sec };
}

for (const [key, f] of Object.entries(copyFields) as [CopyKey, CopyField][]) {
  const meta = fieldMeta[key];
  ready(f.id, copyPath(f), copyWhere(key, f), 'text', 'bilingual', { label: meta?.label });
}

/* ---- 2. records and structured fields of the Homepage ---- */

const home = (sec: string): Where => ({
  page: 'Ana sayfa',
  section: sectionLabel('ana-sayfa', sec),
  screen: 'ana-sayfa',
  editorSection: sec,
});
const settings = (sec: string, page = ALL, section = sectionLabel('ayarlar', sec)): Where => ({
  page,
  section,
  screen: 'ayarlar',
  editorSection: sec,
});
const profile = (sec: string): Where => ({
  page: 'Profil',
  section: sectionLabel('profil', sec),
  screen: 'profil',
  editorSection: sec,
});

ready(summaryLabelField(0).id.replace(/\d+/, '*'), 'summaryRows[].label', home('kisaca'), 'text', 'bilingual', {
  label: 'Özet satırı etiketleri',
});
ready('kisaca.row.*.value', 'summaryRows[].value', home('kisaca'), 'text', 'bilingual', {
  label: 'Özet satırı değerleri',
  derived: true,
});
ready(forceFieldId('*', 'magnitude'), 'forceRecords[].magnitude', home('kuvvetler'), 'number', 'shared', {
  label: 'Kuvvet büyüklüğü',
});
ready(forceFieldId('*', 'angle'), 'forceRecords[].angleDeg', home('kuvvetler'), 'number', 'shared', {
  label: 'Kuvvet yönü',
});
for (const part of ['period', 'title', 'text'] as const) {
  ready(forceFieldId('*', part), `forceRecords[].${part}`, home('kuvvetler'), 'text', 'bilingual', {
    label: { period: 'Kuvvet dönemi', title: 'Kuvvet başlığı', text: 'Kuvvet açıklaması' }[part],
  });
}
ready('kuvvetler.*.record', 'forceRecords[].*', home('kuvvetler'), 'record', 'bilingual', {
  label: 'Kuvvet kaydı: kimlik ve kısa ad',
  derived: true,
});
ready(beamLoadField.id, 'beam.defaultLoad', home('yaklasim'), 'number', 'shared', { label: 'Varsayılan yük konumu' });
ready(topicsField.id, 'academicInterests[]', home('yaklasim'), 'list', 'bilingual', {
  label: 'Akademik ilgi alanları',
});
ready(interestsField.id, 'interests[]', home('yonelim'), 'list', 'bilingual', { label: 'İlgi alanları' });
ready(workshopField.id, 'applied[].*', home('atolye'), 'record', 'bilingual', { label: 'Uyguladığım süreçler' });
ready(`${workshopField.id}.observed`, 'observed[].*', home('atolye'), 'record', 'bilingual', {
  label: 'Gözlemlediğim süreçler',
});
ready(workViewFields.showProjects, 'workView.showProjects', home('calismalar'), 'toggle', 'shared', {
  label: 'Projeler bloğunu göster',
});
ready(workViewFields.showNotes, 'workView.showNotes', home('calismalar'), 'toggle', 'shared', {
  label: 'Notlar bloğunu göster',
});
ready(workViewFields.featured, 'workView.featuredId', home('calismalar'), 'choice', 'shared', {
  label: 'Öne çıkan proje',
});

/* ---- 3. identity, contact, publication ---- */

ready(identityFields.firstName.id, 'identity.firstName', settings('kimlik', ALL, 'Ad'), 'text', 'shared', {
  label: 'Ad',
});
ready(identityFields.lastName.id, 'identity.lastName', settings('kimlik', ALL, 'Soyad'), 'text', 'shared', {
  label: 'Soyad',
});
ready('ayarlar.identity.ownerName', 'ownerName', settings('kimlik', ALL, 'Ad soyad'), 'text', 'shared', {
  label: 'Ad soyad',
  derived: true,
});
ready(contactFields.email, 'contact.email', settings('iletisim', 'Ana sayfa', 'İletişim'), 'text', 'shared', {
  label: 'E-posta',
});
ready('ayarlar.contact.derived', 'contact.*', settings('iletisim', 'Ana sayfa', 'İletişim'), 'record', 'shared', {
  label: 'Platform bağlantıları (platform kayıtlarından türetilir)',
  derived: true,
});
ready(
  'ayarlar.contact.platforms',
  'platforms[].*',
  settings('iletisim', ALL, 'İletişim ve platformlar'),
  'record',
  'shared',
  {
    label: 'Platform kayıtları',
  },
);
ready('ayarlar.lastRevision', 'lastRevision', settings('yayin', ALL, 'Alt bilgi'), 'text', 'shared', {
  label: 'Son revizyon tarihi',
  derived: true,
});

/* ---- 4. profile records and portrait ---- */

const profileRecords = [
  ['education', 'egitim', 'Eğitim kayıtları'],
  ['experience', 'deneyim', 'Deneyim kayıtları'],
  ['memberships', 'topluluk', 'Topluluk kayıtları'],
  ['skills', 'yetkinlikler', 'Yetkinlik grupları'],
  ['languages', 'diller', 'Diller'],
  ['activities', 'etkinlikler', 'Kişisel etkinlikler'],
] as const;
const profilePath = {
  education: 'education',
  experience: 'experience',
  memberships: 'memberships',
  skills: 'skillGroups',
  languages: 'languages',
  activities: 'activities',
} as const;
for (const [key, sec, label] of profileRecords) {
  ready(profileIds[key], `${profilePath[key]}[].*`, profile(sec), 'record', 'bilingual', { label });
}
// The portrait editor lives in Medya; the field ids keep their `profil.` prefix so saved values still apply.
const portraitWhere: Where = { page: 'Profil', section: 'Portre', screen: 'medya' };
for (const part of ['focalX', 'focalY', 'zoom'] as const) {
  ready(portraitFields[part].id, `portrait.${part}`, portraitWhere, 'number', 'shared', {
    label: portraitFields[part].label,
  });
}
ready(portraitFields.alt.id, 'portrait.alt', portraitWhere, 'text', 'bilingual', {
  label: 'Portre alternatif metni',
});

/* ---- 5. fields whose editor is still to come ---- */

const media: Where & { screen: PlannedScreen } = { page: 'Profil', section: 'Portre', screen: 'medya' };
planned('medya.portrait.file', 'portrait.src', media, 'media', 'shared', 'Portre dosyası');
planned('medya.portrait.width', 'portrait.width', media, 'media', 'shared', 'Portre genişliği');
planned('medya.portrait.height', 'portrait.height', media, 'media', 'shared', 'Portre yüksekliği');
planned(
  'medya.cv',
  'cvPdf',
  { page: 'Profil', section: 'Özgeçmiş', screen: 'medya' },
  'media',
  'shared',
  'Özgeçmiş PDF’i',
);

/** Interface strings no editor reaches yet; the Arayüz metinleri screen will list every dictionary key. */
const textsPlanned = (group: string, keys: string[], page: string, section: string) => {
  for (const k of keys)
    planned(`metinler.${group}.${k}`, `dict.${group}.${k}`, { page, section, screen: 'metinler' }, 'text', 'bilingual');
};
textsPlanned(
  'hero',
  ['meta1', 'meta2', 'programValue', 'universityValue', 'graduationValue', 'internshipValue', 'resultantLabel'],
  'Ana sayfa',
  'Hero',
);
textsPlanned(
  'forces',
  ['figure', 'caption', 'figAlt', 'resultText', 'angle', 'reverseLabel', 'reversedNote', 'note'],
  'Ana sayfa',
  'Kuvvetler',
);
textsPlanned('workshop', ['role', 'duration', 'place'], 'Ana sayfa', 'Atölye');
textsPlanned(
  'approach',
  ['exaggeration', 'readouts', 'assumptionsTitle', 'assumptions', 'load', 'maxSub'],
  'Ana sayfa',
  'Yaklaşım',
);
textsPlanned('direction', ['figure'], 'Ana sayfa', 'Yönelim');
textsPlanned('footer', ['rights'], ALL, 'Alt bilgi');
textsPlanned('profile', ['cv'], 'Profil', 'Giriş ve durum');
textsPlanned('sections', ['intro'], 'Profil', 'Giriş ve durum');
textsPlanned(
  'sections',
  ['archive', 'project', 'note', 'footnotes', 'references', 'note-end'],
  'Projeler ve notlar',
  'Bölüm adları',
);
planned('metinler.skip', 'dict.skip', { page: ALL, section: 'Üst bilgi', screen: 'metinler' }, 'text', 'bilingual');
planned(
  'metinler.langNames',
  'dict.langNames',
  { page: ALL, section: 'Dil seçici', screen: 'metinler' },
  'text',
  'bilingual',
);
planned(
  'metinler.notFound',
  'dict.notFound.*',
  { page: 'Bulunamadı sayfası', section: 'Bulunamadı', screen: 'metinler' },
  'text',
  'bilingual',
  'Bulunamadı sayfası metinleri',
);
planned(
  'metinler.projects',
  'dict.projects.*',
  { page: 'Projeler', section: 'Arayüz metinleri', screen: 'metinler' },
  'text',
  'bilingual',
  'Proje sayfaları arayüz metinleri',
);
planned(
  'metinler.notes',
  'dict.notes.*',
  { page: 'Notlar', section: 'Arayüz metinleri', screen: 'metinler' },
  'text',
  'bilingual',
  'Not sayfaları arayüz metinleri',
);

/* ---- 6. project and note records ---- */

type RecordMeta = readonly [screen: PlannedScreen, type: FieldType, locale: FieldLocale, label: string];
type ProjectKey = keyof Extract<ProjectRecord, { visibility: 'published' }>;
type NoteKey = Exclude<keyof NoteRecord, 'tr' | 'en'>;

/** Exhaustive by type: adding a field to `ProjectRecord` fails the build until it is classified here. */
const projectFields: Record<ProjectKey, RecordMeta> = {
  id: ['projeler', 'text', 'shared', 'Kimlik'],
  slug: ['projeler', 'text', 'bilingual', 'Adres parçası'],
  title: ['projeler', 'text', 'bilingual', 'Başlık'],
  subtitle: ['projeler', 'text', 'bilingual', 'Alt başlık'],
  kind: ['projeler', 'choice', 'shared', 'Tür'],
  disciplines: ['projeler', 'list', 'shared', 'Disiplinler'],
  status: ['projeler', 'choice', 'shared', 'Durum'],
  context: ['projeler', 'choice', 'shared', 'Bağlam'],
  period: ['projeler', 'record', 'shared', 'Dönem'],
  featured: ['projeler', 'toggle', 'shared', 'Öne çıkan'],
  hero: ['projeler', 'choice', 'shared', 'Üst kompozisyon'],
  cover: ['medya', 'media', 'shared', 'Kapak görseli'],
  tools: ['projeler', 'list', 'shared', 'Araçlar'],
  materials: ['projeler', 'list', 'bilingual', 'Malzemeler'],
  objective: ['projeler', 'list', 'bilingual', 'Amaç'],
  process: ['projeler', 'list', 'bilingual', 'Süreç'],
  methodology: ['projeler', 'list', 'bilingual', 'Yöntem'],
  measurements: ['projeler', 'record', 'bilingual', 'Ölçümler'],
  calculations: ['projeler', 'record', 'bilingual', 'Hesaplar'],
  decisions: ['projeler', 'record', 'bilingual', 'Tasarım kararları'],
  learnings: ['projeler', 'list', 'bilingual', 'Öğrenilenler'],
  results: ['projeler', 'list', 'bilingual', 'Sonuçlar'],
  conclusions: ['projeler', 'list', 'bilingual', 'Çıkarımlar'],
  figures: ['medya', 'media', 'bilingual', 'Şekiller'],
  preview3d: ['cad-glb', 'media', 'bilingual', '3B önizleme'],
  revisions: ['projeler', 'record', 'bilingual', 'Revizyonlar'],
  relatedIds: ['projeler', 'list', 'shared', 'İlgili kayıtlar'],
  privateOriginals: ['cad-glb', 'record', 'bilingual', 'Özel CAD özgün dosyaları (yalnızca üst veri)'],
  fixture: ['projeler', 'toggle', 'shared', 'Geliştirme örneği işareti'],
  visibility: ['projeler', 'choice', 'shared', 'Görünürlük'],
  approved: ['projeler', 'toggle', 'shared', 'Onay'],
};
const noteFields: Record<NoteKey, RecordMeta> = {
  id: ['notlar', 'text', 'shared', 'Kimlik'],
  status: ['notlar', 'choice', 'shared', 'Durum'],
  approved: ['notlar', 'toggle', 'shared', 'Onay'],
  fixture: ['notlar', 'toggle', 'shared', 'Geliştirme örneği işareti'],
  published: ['notlar', 'text', 'shared', 'Yayım tarihi'],
  updated: ['notlar', 'text', 'shared', 'Güncelleme tarihi'],
  featured: ['notlar', 'toggle', 'shared', 'Öne çıkan'],
  cover: ['medya', 'media', 'shared', 'Kapak görseli'],
  relatedIds: ['notlar', 'list', 'shared', 'İlgili kayıtlar'],
};
const noteContentFields: Record<keyof NoteContent, RecordMeta> = {
  slug: ['notlar', 'text', 'bilingual', 'Adres parçası'],
  title: ['notlar', 'text', 'bilingual', 'Başlık'],
  subtitle: ['notlar', 'text', 'bilingual', 'Alt başlık'],
  summary: ['notlar', 'text', 'bilingual', 'Özet'],
  category: ['notlar', 'text', 'bilingual', 'Kategori'],
  tags: ['notlar', 'list', 'bilingual', 'Etiketler'],
  blocks: ['notlar', 'record', 'bilingual', 'Gövde blokları'],
  footnotes: ['notlar', 'record', 'bilingual', 'Dipnotlar'],
  references: ['notlar', 'record', 'bilingual', 'Kaynakça'],
  revisions: ['notlar', 'record', 'bilingual', 'Revizyonlar'],
  coverAlt: ['notlar', 'text', 'bilingual', 'Kapak alternatif metni'],
};

function recordFields(
  prefix: string,
  page: string,
  section: string,
  table: Record<string, RecordMeta>,
  skip: readonly string[] = [],
) {
  for (const [key, [screen, type, locale, label]] of Object.entries(table)) {
    if (skip.includes(key)) continue;
    planned(`${screen}.${prefix}.${key}`, `${prefix}.${key}`, { page, section, screen }, type, locale, label);
  }
}
recordFields('project', 'Projeler', 'Proje kaydı', projectFields, ['fixture']);
// Shown as a read-only chip in the project list; set by the sample loader, never edited.
ready(
  'projeler.project.fixture',
  'project.fixture',
  { page: 'Projeler', section: 'Proje kaydı', screen: 'projeler' },
  'toggle',
  'shared',
  { label: 'Geliştirme örneği işareti', derived: true },
);
recordFields('note', 'Notlar', 'Not kaydı', noteFields);
recordFields('note.content', 'Notlar', 'Not içeriği', noteContentFields);

export const registry: readonly RegistryEntry[] = entries;

/** Project and note field paths (their types have no runtime shape; the tables above are exhaustive by type). */
export const recordFieldPaths: readonly string[] = [
  ...Object.keys(projectFields).map((k) => `project.${k}`),
  ...Object.keys(noteFields).map((k) => `note.${k}`),
  ...Object.keys(noteContentFields).map((k) => `note.content.${k}`),
];

/** The public field model: every leaf of the Homepage/Profile content plus the project and note record fields. */
export const publicFieldPaths = (): string[] => [...publicLeaves(getSiteContent()), ...recordFieldPaths];
