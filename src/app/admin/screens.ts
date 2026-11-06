/** ANTET screen registry. Pure data, safe to import from server and client. */
export type SectionStatus = 'ok' | 'draft' | 'later';
type SectionDef = { id: string; label: string; status: SectionStatus };
/**
 * Rail labels while the side panel is collapsed: two capitals from the Turkish title, unique across the list.
 * A first word of exactly two characters is used whole ("ve" and "&" are skipped). Otherwise, several words: the first letters of the first two words. One word: its first two letters. When a label is taken,
 * the first letter plus the next consonant of the title that gives a free label.
 */
export function railLabels(titles: string[]): string[] {
  const up = (s: string) => s.toLocaleUpperCase('tr');
  const vowels = 'AEIİOÖUÜ';
  const taken = new Set<string>();
  return titles.map((title) => {
    const words = title
      .trim()
      .split(/\s+/)
      .filter((w) => w !== '&' && w.toLocaleLowerCase('tr') !== 've');
    const letters = Array.from(up(title.replace(/\s+/g, '')));
    const first = Array.from(up(words[0]))[0];
    const whole = Array.from(words[0]).length === 2;
    const base = whole ? up(words[0]) : words.length > 1 ? first + Array.from(up(words[1]))[0] : first + letters[1];
    let label = base;
    if (taken.has(label)) {
      const consonants = letters.slice(1).filter((c) => !vowels.includes(c));
      label = consonants.map((c) => first + c).find((c) => !taken.has(c)) ?? base;
    }
    taken.add(label);
    return label;
  });
}

export type ScreenDef = {
  slug: string; // "" = /admin
  /** Rail label while the side panel is collapsed; derived by `railLabels`, never typed. */
  short: string;
  title: string;
  lede: string;
  group: 'work' | 'meta';
  preview: string | null; // preview route under /admin/onizleme, or null
  sections: SectionDef[];
  /** Sections of the list page (/admin/<slug>) when it differs from the record pages that `sections` describes. */
  listSections?: SectionDef[];
  stage: number;
};

const defs: Omit<ScreenDef, 'short'>[] = [
  {
    slug: '',
    title: 'Genel bakış',
    lede: 'Çalışma masasının özeti: görevler, son revizyonlar ve kayıt sayıları.',
    group: 'work',
    preview: null,
    stage: 7,
    sections: [],
  },
  {
    slug: 'ana-sayfa',
    title: 'Ana sayfa',
    lede: 'Genel sitenin ilk sayfasındaki sekiz bölümü düzenleyin; değişiklikler önizlemede görünür.',
    group: 'work',
    preview: 'ana-sayfa',
    stage: 3,
    sections: [
      { id: 'hero', label: 'Hero', status: 'ok' },
      { id: 'kisaca', label: 'Kısaca', status: 'draft' },
      { id: 'kuvvetler', label: 'Kuvvetler', status: 'draft' },
      { id: 'atolye', label: 'Atölye', status: 'ok' },
      { id: 'yaklasim', label: 'Yaklaşım', status: 'ok' },
      { id: 'calismalar', label: 'Çalışmalar', status: 'ok' },
      { id: 'yonelim', label: 'Yönelim', status: 'ok' },
      { id: 'iletisim', label: 'İletişim', status: 'ok' },
      { id: 'global', label: 'Üst ve alt bilgi', status: 'ok' },
    ],
  },
  {
    slug: 'profil',
    title: 'Profil',
    lede: 'Profil sayfasındaki kayıtlar ve metinler; Ana sayfadaki türetilmiş alanlar aynı kayıtlardan beslenir.',
    group: 'work',
    preview: 'profil',
    stage: 4,
    sections: [
      { id: 'giris', label: 'Giriş ve durum', status: 'draft' },
      { id: 'egitim', label: 'Eğitim', status: 'ok' },
      { id: 'deneyim', label: 'Deneyim', status: 'ok' },
      { id: 'topluluk', label: 'Topluluk', status: 'ok' },
      { id: 'yetkinlikler', label: 'Yetkinlikler', status: 'ok' },
      { id: 'diller', label: 'Diller', status: 'ok' },
      { id: 'ilgi', label: 'İlgi alanları', status: 'ok' },
      { id: 'etkinlikler', label: 'Kişisel etkinlikler', status: 'draft' },
      { id: 'portre', label: 'Portre', status: 'ok' },
      { id: 'etiketler', label: 'Etiketler ve başlıklar', status: 'ok' },
    ],
  },
  {
    slug: 'projeler',
    title: 'Projeler',
    lede: 'Projeleri ekleyin, düzenleyin ve hangilerinin yayında olduğunu görün.',
    group: 'work',
    preview: 'projeler',
    stage: 5,
    listSections: [{ id: 'kayitlar', label: 'Kayıtlar', status: 'ok' }],
    sections: [
      { id: 'kimlik', label: 'Kimlik', status: 'ok' },
      { id: 'antet', label: 'Antet', status: 'ok' },
      { id: 'gorsel', label: 'Görsel', status: 'ok' },
      { id: 'govde', label: 'Gövde', status: 'ok' },
      { id: 'sekiller', label: 'Şekiller', status: 'ok' },
      { id: 'model', label: '3B ve CAD', status: 'ok' },
      { id: 'iliskiler', label: 'İlişkiler', status: 'ok' },
      { id: 'revizyonlar', label: 'Revizyonlar', status: 'ok' },
      { id: 'yayin', label: 'Yayın', status: 'ok' },
    ],
  },
  {
    slug: 'notlar',
    title: 'Notlar',
    lede: 'Teknik notlar ve makaleler.',
    group: 'work',
    preview: 'notlar',
    stage: 6,
    listSections: [{ id: 'kayitlar', label: 'Kayıtlar', status: 'ok' }],
    sections: [
      { id: 'ustbilgi', label: 'Üstbilgi', status: 'ok' },
      { id: 'govde', label: 'Gövde', status: 'ok' },
      { id: 'dipnotlar', label: 'Dipnotlar', status: 'ok' },
      { id: 'kaynaklar', label: 'Kaynaklar', status: 'ok' },
      { id: 'revizyonlar', label: 'Revizyonlar', status: 'ok' },
      { id: 'yayin', label: 'Yayın', status: 'ok' },
    ],
  },
  {
    slug: 'medya',
    title: 'Medya',
    lede: 'Görsel kitaplığı ve portre alanı.',
    group: 'work',
    preview: null,
    stage: 5,
    sections: [
      { id: 'portre', label: 'Portre', status: 'ok' },
      { id: 'kitaplik', label: 'Görsel kitaplığı', status: 'ok' },
    ],
  },
  {
    slug: 'cad-glb',
    title: '3B ve CAD',
    lede: 'GLB önizlemeleri ve özel CAD özgün dosyaları.',
    group: 'work',
    preview: 'projeler',
    stage: 5,
    sections: [
      { id: 'projeler', label: 'Projeler', status: 'ok' },
      { id: 'onizleme', label: '3B önizleme', status: 'ok' },
      { id: 'ozgunler', label: 'Özel dosyalar', status: 'ok' },
    ],
  },
  {
    slug: 'metinler',
    title: 'Arayüz metinleri',
    lede: 'Sitedeki tüm arayüz metinleri, gruplanmış ve aranabilir.',
    group: 'work',
    preview: 'ana-sayfa',
    stage: 4,
    sections: [
      { id: 'meta', label: 'Sayfa meta bilgisi', status: 'ok' },
      { id: 'nav', label: 'Gezinme', status: 'ok' },
      { id: 'sections', label: 'Bölüm adları', status: 'ok' },
      { id: 'notes', label: 'Notlar', status: 'ok' },
      { id: 'profile', label: 'Profil', status: 'ok' },
      { id: 'hero', label: 'Hero', status: 'ok' },
      { id: 'intro', label: 'Kısaca', status: 'ok' },
      { id: 'forces', label: 'Kuvvetler', status: 'ok' },
      { id: 'workshop', label: 'Atölye', status: 'ok' },
      { id: 'approach', label: 'Yaklaşım', status: 'ok' },
      { id: 'work', label: 'Çalışmalar', status: 'ok' },
      { id: 'projects', label: 'Projeler', status: 'ok' },
      { id: 'notFound', label: 'Bulunamadı sayfası', status: 'ok' },
      { id: 'direction', label: 'Yönelim', status: 'ok' },
      { id: 'contact', label: 'İletişim', status: 'ok' },
      { id: 'footer', label: 'Alt bilgi', status: 'ok' },
    ],
  },
  {
    slug: 'ayarlar',
    title: 'Site ayarları',
    lede: 'Kimlik, iletişim, gezinme ve sayfa meta bilgisi; Ana sayfa düzenleyicisiyle aynı alanlar.',
    group: 'work',
    preview: 'ana-sayfa',
    stage: 4,
    sections: [
      { id: 'kimlik', label: 'Kimlik', status: 'ok' },
      { id: 'iletisim', label: 'İletişim ve platformlar', status: 'ok' },
      { id: 'gezinme', label: 'Gezinme', status: 'ok' },
      { id: 'meta', label: 'Sayfa meta bilgisi', status: 'ok' },
      { id: 'yayin', label: 'Yayın bilgisi', status: 'ok' },
    ],
  },
  {
    slug: 'yayin',
    title: 'Yayın',
    lede: 'Simüle edilmiş yayın: değişiklik listesi, fark görünümü ve revizyonlar.',
    group: 'meta',
    preview: null,
    stage: 7,
    sections: [
      { id: 'bekleyen', label: 'Bekleyen değişiklikler', status: 'ok' },
      { id: 'denetimler', label: 'Denetimler', status: 'ok' },
      { id: 'revizyonlar', label: 'Revizyonlar', status: 'ok' },
      { id: 'demo', label: 'Demo', status: 'ok' },
    ],
  },
  {
    slug: 'kapsam',
    title: 'Kapsam matrisi',
    lede: 'Genel sitedeki içeriğin hangi alandan düzenlendiğini gösteren otomatik görünüm.',
    group: 'meta',
    preview: null,
    stage: 3,
    sections: [],
  },
];

const rail = railLabels(defs.map((d) => d.title));
export const screens: ScreenDef[] = defs.map((d, i) => ({ ...d, short: rail[i] }));

export const screenHref = (s: ScreenDef) => (s.slug ? `/admin/${s.slug}` : '/admin');
/** The sheet number of a screen is its position in the side panel, so every page header agrees with it. */
export const sheetNumber = (slug: string) => screens.findIndex((s) => s.slug === slug) + 1;
export const sheetLabel = (slug: string) => `Pafta ${String(sheetNumber(slug)).padStart(2, '0')}`;
export const screenBySlug = (slug: string) => screens.find((s) => s.slug === slug);
export const subRecordScreens = ['projeler'];

export const devices = [
  { id: 390, label: 'Mobil' },
  { id: 768, label: 'Tablet' },
  { id: 1440, label: 'Masaüstü' },
] as const;
export type DeviceId = (typeof devices)[number]['id'];

export { fold } from '@/lib/fold';
