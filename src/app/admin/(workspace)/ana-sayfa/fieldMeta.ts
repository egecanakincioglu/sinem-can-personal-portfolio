import type { CopyKey } from '@/lib/preview-bridge';

/** Admin wording (Turkish only) for the registry's text fields. The limits, tokens and public sources live in
 *  lib/preview-bridge.ts `copyFields`; this table only adds the label and helper the generic editor prints. */
export type FieldMeta = { label: string; helper?: string; multiline?: boolean; draft?: boolean };

export const fieldMeta: Partial<Record<CopyKey, FieldMeta>> = {
  // Kısaca
  introHeading: { label: 'Bölüm başlığı', helper: 'Kısaca bölümünün küçük başlığı.' },
  introSummary: { label: 'Özet başlığı', helper: 'Özet satırlarının üzerindeki etiket.' },
  introFullProfile: { label: 'Profil bağlantısı', helper: 'Bölümün sonundaki bağlantının metni.' },
  introBody: {
    label: 'Giriş paragrafı',
    multiline: true,
    draft: true,
    helper: 'Staj bilgilerini içerir; yalnızca doğrulanmış gerçekleri yazın. Yazarın onayını bekleyen taslak metin.',
  },
  introNote: {
    label: 'Kenar notu',
    multiline: true,
    draft: true,
    helper: 'Paragrafın yanındaki numaralı not (1). Yazarın onayını bekleyen taslak metin.',
  },
  // Atölye
  workshopHeading: { label: 'Bölüm başlığı', helper: 'Atölye bölümünün büyük başlığı.' },
  workshopInternship: {
    label: 'Staj etiketi',
    helper: 'Kurum adının üzerindeki küçük etiket. Kurum, süre ve yer Deneyim kaydından gelir.',
  },
  workshopAppliedHint: { label: '“Uyguladım” alt açıklaması' },
  workshopObservedHint: { label: '“Gözlemledim” alt açıklaması' },
  // Çalışmalar
  workHeading: { label: 'Bölüm başlığı' },
  workProjects: { label: 'Projeler etiketi', helper: 'Boş durum kartının üzerindeki etiket.' },
  workNotes: { label: 'Notlar etiketi' },
  workEmptyProjects: { label: 'Boş durum başlığı', helper: 'Yayımlanmış ve onaylanmış proje yokken görünür.' },
  workEmptyProjectsText: { label: 'Boş durum açıklaması', multiline: true },
  workEmptyNotes: { label: 'Not yok metni', helper: 'Yayımlanmış not yokken görünür.' },
  workAllNotes: { label: '“Tüm notlar” bağlantısı' },
  workToProfile: { label: 'Profil bağlantısı', helper: 'Boş durum kartındaki bağlantı.' },
  workAllProjects: {
    label: '“Tüm projeler” bağlantısı',
    helper: 'Proje satırlarının altındaki bağlantı (proje varken görünür).',
  },
  workDrawnBy: { label: 'Antet: Çizen etiketi', helper: 'Değer, Hero’daki ad-soyaddan türetilir.' },
  workStatus: { label: 'Antet: Durum etiketi' },
  workStatusValue: { label: 'Antet: Durum değeri' },
  workRev: { label: 'Antet: Revizyon etiketi', helper: 'Değer (—) projelerin durumundan türetilir.' },
  // Yönelim
  directionHeading: { label: 'Bölüm başlığı' },
  directionOpenness: {
    label: 'Açıklık cümlesi',
    multiline: true,
    draft: true,
    helper: 'Bölümün sonundaki cümle. Yazarın onayını bekleyen taslak metin.',
  },
  // İletişim
  contactHeading: { label: 'Bölüm başlığı' },
  contactLead: { label: 'Davet cümlesi', multiline: true },
  contactLinkedin: { label: 'LinkedIn düğmesi' },
  contactAlso: { label: '“Ayrıca” etiketi', helper: 'Diğer hesapların önündeki küçük etiket.' },
  contactCopy: { label: 'Kopyala düğmesi' },
  contactCopied: { label: 'Kopyalandı iletisi' },
  contactCopyFailed: { label: 'Kopyalanamadı iletisi' },
  contactCopyLabel: { label: 'Kopyala düğmesi erişilebilirlik adı', helper: 'Ekran okuyucular içindir.' },
  contactExternal: {
    label: '“Yeni sekmede açılır” metni',
    helper: 'Ekran okuyucular içindir; görsel olarak görünmez.',
  },
  // Üst bilgi
  navLabel: { label: 'Gezinme erişilebilirlik adı', helper: 'Ekran okuyucular içindir.' },
  navProfile: { label: 'Gezinme: Profil' },
  navProjects: { label: 'Gezinme: Projeler' },
  navNotes: { label: 'Gezinme: Notlar' },
  navContact: { label: 'Gezinme: İletişim' },
  navMenu: { label: 'Menü düğmesi', helper: 'Mobilde görünür.' },
  navClose: { label: 'Kapat düğmesi', helper: 'Mobil menüde görünür.' },
  navLanguage: { label: 'Dil grubu erişilebilirlik adı' },
  secTop: {
    label: 'Okunan bölüm: Ana sayfa',
    helper: 'Üst bilgide ad yanında görünen bölüm adı; alt bilgideki “Pafta” değeri de budur.',
  },
  secProfile: { label: 'Okunan bölüm: Kısaca' },
  secForces: { label: 'Okunan bölüm: Kuvvetler' },
  secWorkshop: { label: 'Okunan bölüm: Atölye' },
  secApproach: { label: 'Okunan bölüm: Yaklaşım' },
  secWork: { label: 'Okunan bölüm: Çalışmalar' },
  secDirection: { label: 'Okunan bölüm: Yönelim' },
  secContact: { label: 'Okunan bölüm: İletişim' },
  // Altbilgi
  footerSentence: { label: 'Alt bilgi cümlesi', multiline: true },
  footerDrawnBy: { label: 'Hücre etiketi: Çizen' },
  footerSheet: { label: 'Hücre etiketi: Pafta' },
  footerLanguage: { label: 'Hücre etiketi: Dil' },
  footerContact: { label: 'Hücre etiketi: İletişim' },
  footerLinks: { label: 'Hücre etiketi: Bağlantılar' },
  footerRevision: { label: 'Hücre etiketi: Son revizyon' },
  // Profil
  profileH1: { label: 'Sayfa başlığı (H1)' },
  profileLead: {
    label: 'Tanıtım cümlesi',
    multiline: true,
    draft: true,
    helper:
      'Adın yanındaki ilk cümle. Metindeki üniversite ve bölüm, Eğitim kaydından gelir; metni elle düzenlerseniz artık sabit metindir. Yazarın onayını bekleyen taslak.',
  },
  profileBody: {
    label: 'Mesleki tanıtım ve biyografi',
    multiline: true,
    draft: true,
    helper:
      'Staj ayı ve yeri Deneyim kaydından gelir; metni elle düzenlerseniz sabit metin olur. Yalnızca doğrulanmış gerçekleri yazın. Yazarın onayını bekleyen taslak.',
  },
  profileNow: { label: 'Durum etiketi', helper: '“Şu anda” satırının etiketi.' },
  profileNowValue: {
    label: 'Güncel durum ve yönelim',
    multiline: true,
    helper:
      'Şu anki durum satırı. Varsayılan metin bölüm ve mezuniyet ayını Eğitim kaydından üretir; elle düzenlenirse sabit metin olur.',
  },
  profileIndex: { label: 'İndeks: Giriş etiketi' },
  profileOnThisPage: { label: 'İndeks başlığı', helper: '“Bu sayfada” gezinme başlığı.' },
  profileExpected: {
    label: '“Beklenen mezuniyet” etiketi',
    helper: 'Eğitim kaydının dönem satırının altında görünür; Ana sayfadaki etiketlerden ayrı bir alandır.',
  },
  profileScore: { label: 'Mezuniyet puanı etiketi' },
  profileAcademic: { label: 'Akademik ilgi alanları başlığı' },
  profileInterestsCaption: { label: 'İlgi alanları alt yazısı' },
  academicIntro: {
    label: 'Eğitim giriş cümlesi',
    multiline: true,
    draft: true,
    helper: 'Akademik ilgi alanlarının üzerindeki cümle. Yazarın onayını bekleyen taslak.',
  },
  academicNote: {
    label: 'Eğitim kenar notu',
    multiline: true,
    draft: true,
    helper: 'Numaralı not (1). Yazarın onayını bekleyen taslak.',
  },
  experienceIntro: {
    label: 'Deneyim giriş cümlesi',
    multiline: true,
    draft: true,
    helper: 'Uygulanan ve gözlemlenen süreçlerin üzerindeki cümle. Yazarın onayını bekleyen taslak.',
  },
  rastageNote: {
    label: 'Topluluk kenar notu',
    multiline: true,
    draft: true,
    helper: 'Numaralı not (2). Yazarın onayını bekleyen taslak.',
  },
  offField: {
    label: 'Saha dışı giriş cümlesi',
    multiline: true,
    draft: true,
    helper: 'Kişisel etkinliklerin üzerindeki cümle. Yazarın onayını bekleyen taslak.',
  },
  teamSportNote: {
    label: 'Saha dışı kenar notu',
    multiline: true,
    draft: true,
    helper: 'Numaralı not (3). Yazarın onayını bekleyen taslak.',
  },
  secEducation: { label: 'Bölüm başlığı: Eğitim' },
  secExperience: { label: 'Bölüm başlığı: Deneyim' },
  secCommunity: { label: 'Bölüm başlığı: Topluluk' },
  secSkills: { label: 'Bölüm başlığı: Yetkinlikler' },
  secLanguages: { label: 'Bölüm başlığı: Diller' },
  secInterests: { label: 'Bölüm başlığı: İlgi alanları' },
  secOffField: { label: 'Bölüm başlığı: Kişisel etkinlikler' },
  // Sayfa meta bilgisi (Site ayarları)
  metaTitle: { label: 'Ana sayfa: tarayıcı başlığı', helper: 'Arama sonuçlarında ve sekmede görünen başlık.' },
  metaDescription: { label: 'Ana sayfa: açıklama', multiline: true },
  profMetaTitle: { label: 'Profil: tarayıcı başlığı' },
  profMetaDescription: { label: 'Profil: açıklama', multiline: true },
  projMetaTitle: { label: 'Projeler: tarayıcı başlığı' },
  projMetaDescription: { label: 'Projeler: açıklama', multiline: true },
  notesMetaTitle: { label: 'Notlar: tarayıcı başlığı' },
  notesMetaDescription: { label: 'Notlar: açıklama', multiline: true },
};
