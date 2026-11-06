import type { Discipline, ProjectContext, ProjectKind, ProjectStatus } from './projects/types';
import { fill } from '@/lib/format';
import type { Copy } from './types';
import { labels, tokens } from './site';

// Interface strings and section copy, kept apart from biographical data (content/site.ts).
// UI strings live in their own dictionary so they can be swapped independently.

/** Strings that several pages repeat. Defined once; the old key paths below alias them. */
const shared = {
  profile: { tr: 'Profil', en: 'Profile' },
  contact: { tr: 'İletişim', en: 'Contact' },
  inBrief: { tr: 'Kısaca', en: 'In brief' },
  work: { tr: 'Çalışmalar', en: 'Work' },
  allNotes: { tr: 'Tüm notlar', en: 'All notes' },
  emptyNotes: { tr: 'Henüz yayımlanmış bir not yok.', en: 'No notes published yet.' },
  emptyProjectsTitle: { tr: 'Pafta hazırlanıyor.', en: 'Drawings in progress.' },
  emptyProjectsText: {
    tr: 'İlk projeler belgelendikçe burada yer alacak.',
    en: 'The first projects will appear here as they are documented.',
  },
  inPreparation: { tr: 'Hazırlanıyor', en: 'In preparation' },
  rev: { tr: 'Rev.', en: 'Rev.' },
  copy: { tr: 'Kopyala', en: 'Copy' },
  copied: { tr: 'Kopyalandı', en: 'Copied' },
  copyFailed: { tr: 'Kopyalanamadı', en: "Couldn't copy" },
} satisfies Record<string, Copy>;

/** Fills the static {tokens} (name, program, university, grad, year, count, a0 ...) in every localised leaf.
 *  Runtime tokens such as {n} {deg} {a} {ra} {rb} are not in the token set and stay for the component to fill. */
type TokenSet = { tr: Record<string, string>; en: Record<string, string> };
function resolve<T>(v: T, tk: TokenSet): T {
  if (Array.isArray(v)) return v.map((x) => resolve(x, tk)) as T;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.tr === 'string' && typeof o.en === 'string') {
      return { ...o, tr: fill(o.tr, tk.tr), en: fill(o.en, tk.en) } as T;
    }
    return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, resolve(x, tk)])) as T;
  }
  return v;
}

/** Unresolved dictionary: `{tokens}` still in place. `resolveDict` fills them from a token set, so the Admin preview
 *  can re-derive the dictionary from edited records (name, program, internship …) without a second copy. */
export const dictTemplate = {
  meta: {
    title: { tr: '{name} — {program}', en: '{name} — {program}' },
    description: {
      tr: "{university} {programLc} son sınıf öğrencisi {name}'ın portfolyosu.",
      en: 'Portfolio of {name}, a senior {programLc} student at {university}.',
    },
  },
  skip: { tr: 'İçeriğe geç', en: 'Skip to content' },
  nav: {
    label: { tr: 'Ana gezinme', en: 'Main navigation' },
    profile: shared.profile,
    projects: { tr: 'Projeler', en: 'Projects' },
    notes: { tr: 'Notlar', en: 'Notes' },
    contact: shared.contact,
    menu: { tr: 'Menü', en: 'Menu' },
    close: { tr: 'Kapat', en: 'Close' },
    language: { tr: 'Dil', en: 'Language' },
  },
  sections: {
    top: { tr: 'Ana sayfa', en: 'Home' },
    profile: shared.inBrief,
    forces: { tr: 'Kuvvetler', en: 'Forces' },
    workshop: { tr: 'Atölye', en: 'Workshop' },
    approach: { tr: 'Yaklaşım', en: 'Approach' },
    work: shared.work,
    direction: { tr: 'Yönelim', en: 'Direction' },
    contact: shared.contact,
    // profile page (ids are language-neutral so #hash survives a language switch)
    intro: shared.profile,
    education: { tr: 'Eğitim', en: 'Education' },
    experience: { tr: 'Deneyim', en: 'Experience' },
    community: { tr: 'Topluluk', en: 'Community' },
    skills: { tr: 'Yetkinlikler', en: 'Skills' },
    languages: { tr: 'Diller', en: 'Languages' },
    interests: { tr: 'İlgi alanları', en: 'Areas of interest' },
    'off-field': { tr: 'Saha dışında', en: 'Off the field' },
    // projects pages
    archive: { tr: 'Arşiv', en: 'Archive' },
    project: { tr: 'Proje', en: 'Project' },
    // notes pages
    note: { tr: 'Not', en: 'Note' },
    footnotes: { tr: 'Dipnotlar', en: 'Footnotes' },
    references: { tr: 'Kaynaklar', en: 'References' },
    'note-end': { tr: 'Sonuç', en: 'Ending' },
  } satisfies Record<string, Copy>,
  notes: {
    metaTitle: { tr: 'Notlar — {name}', en: 'Notes — {name}' },
    metaDescription: {
      tr: "{name}'ın ders, laboratuvar ve atölyeden mühendislik notları.",
      en: "{name}'s engineering notes from the classroom, the lab and the workshop.",
    },
    // Draft copy: personal voice, awaiting Sinem's approval.
    eyebrow: { tr: 'Mühendislik defteri', en: 'Engineering notebook' },
    title: { tr: 'Notlar', en: 'Notes' },
    lead: {
      tr: 'Ders, laboratuvar ve atölyeden; anlatmaya değer bulduğum konular.',
      en: 'From the classroom, the lab and the workshop: things worth explaining.',
    },
    emptyTitle: shared.emptyNotes,
    emptyText: {
      tr: 'İlk not yayımlandığında burada, tarihi ve okuma süresiyle birlikte listelenecek.',
      en: 'The first note will be listed here, with its date and reading time, once it is published.',
    },
    emptyAside: {
      tr: 'Her not, varsayımlarını ve kaynaklarını yanında taşıyacak.',
      en: 'Each note will carry its assumptions and sources with it.',
    },
    toProfile: shared.profile,
    toProjects: { tr: 'Projeler', en: 'Projects' },
    latest: { tr: 'En yeni', en: 'Latest' },
    archive: shared.allNotes,
    topics: { tr: 'Konular', en: 'Topics' },
    allTopics: { tr: 'Tümü', en: 'All' },
    minRead: { tr: '{n} dk okuma', en: '{n} min read' },
    langBoth: { tr: 'TR · EN', en: 'TR · EN' },
    langOnlyTr: { tr: 'Yalnızca TR', en: 'TR only' },
    langOnlyEn: { tr: 'Yalnızca EN', en: 'EN only' },
    read: { tr: 'Notu oku', en: 'Read the note' },
    fixtureLabel: { tr: 'Geliştirme örneği, gerçek bir not değildir', en: 'Development sample, not a real note' },
    // article
    back: shared.allNotes,
    published: { tr: 'Yayım', en: 'Published' },
    updated: { tr: 'Güncelleme', en: 'Updated' },
    readingTime: { tr: 'Okuma süresi', en: 'Reading time' },
    by: { tr: 'Yazan', en: 'By' },
    sampleAuthor: { tr: "Geliştirme örneği · {name}'a ait değildir", en: 'Development sample · not by {name}' },
    onThisPage: { tr: 'Bu yazıda', en: 'In this note' },
    sectionLink: { tr: 'Bu bölüme bağlantı', en: 'Link to this section' },
    copy: shared.copy,
    copyCode: { tr: 'Kodu kopyala', en: 'Copy code' },
    copied: shared.copied,
    copyFailed: shared.copyFailed,
    code: { tr: 'Kod', en: 'Code' },
    equation: { tr: 'Denklem', en: 'Equation' },
    figure: { tr: 'Şekil', en: 'Fig.' },
    table: { tr: 'Tablo', en: 'Table' },
    tableScroll: { tr: 'Tablo, yatay kaydırılabilir', en: 'Table, scrolls horizontally' },
    callouts: {
      assumption: { tr: 'Varsayım', en: 'Assumption' },
      limitation: { tr: 'Sınırlama', en: 'Limitation' },
      note: { tr: 'Not', en: 'Note' },
    },
    backToText: { tr: 'Metne dön', en: 'Back to text' },
    revisions: { tr: 'Revizyonlar', en: 'Revisions' },
    aboutAuthor: { tr: 'Yazar hakkında', en: 'About the author' },
    authorLine: {
      tr: '{program} son sınıf öğrencisi, {university}.',
      en: 'Senior {programLc} student, {university}.',
    },
    toProfileLink: shared.profile,
    spotError: { tr: 'Bir hata mı gördünüz?', en: 'Spotted a mistake?' },
    errorSubject: { tr: 'Not hakkında düzeltme', en: 'Correction for a note' },
    related: { tr: 'İlgili notlar', en: 'Related notes' },
    next: { tr: 'Sonraki not', en: 'Next note' },
    langNote: {
      tr: 'Bu not yalnızca Türkçe yayımlandı.',
      en: 'This note is published in English only.',
    },
  },
  profile: {
    metaTitle: { tr: 'Profil — {name}', en: 'Profile — {name}' },
    metaDescription: {
      tr: "{name}'ın eğitimi, stajı, topluluk çalışması, yetkinlikleri, dilleri ve ilgi alanları.",
      en: "{name}'s education, internship, community work, skills, languages and areas of interest.",
    },
    h1: shared.profile,
    onThisPage: { tr: 'Bu sayfada', en: 'On this page' },
    now: { tr: 'Şu anda', en: 'Right now' },
    nowValue: {
      tr: '{program} son sınıf öğrencisi · beklenen mezuniyet {grad}',
      en: 'Senior {programLc} student · expected graduation {grad}',
    },
    index: { tr: 'Giriş', en: 'Introduction' },
    expected: labels.graduation,
    score: { tr: 'Mezuniyet puanı', en: 'Graduation score' },
    academic: { tr: 'Akademik ilgi alanları', en: 'Academic interests' },
    interestsCaption: { tr: 'Gelecekte çalışmak istediğim alanlar.', en: "Areas I'd like to work in, in the future." },
    cv: { tr: 'Özgeçmişi indir (PDF)', en: 'Download CV (PDF)' },
  },
  hero: {
    meta1: { tr: '{program} · Son sınıf öğrencisi', en: '{program} · Senior student' },
    meta2: {
      tr: '{university} — beklenen mezuniyet {grad}',
      en: '{university} — expected graduation {grad}',
    },
    isolation: { tr: 'serbest cisim', en: 'free body' },
    whatIs: { tr: 'Serbest cisim nedir?', en: 'What is a free body?' },
    direction: { tr: 'Yönelim:', en: 'Direction:' },
    briefly: shared.inBrief,
    program: labels.program,
    programValue: { tr: '{program}', en: '{program}' },
    university: labels.university,
    universityValue: { tr: '{university}', en: '{university}' },
    graduation: labels.graduation,
    graduationValue: { tr: '{grad}', en: '{grad}' },
    internship: { tr: 'Staj', en: 'Internship' },
    internshipValue: { tr: '{org}, {internMonth}', en: '{org}, {internMonth}' },
    resultantLabel: { tr: 'Bileşke', en: 'Resultant' },
    resultantAlt: {
      tr: 'Bileşke vektörü R, yatayla yaklaşık {deg} derecelik açı yapıyor.',
      en: 'Resultant vector R, pointing about {deg} degrees above horizontal.',
    },
  },
  intro: {
    heading: shared.inBrief,
    summary: { tr: 'Özet', en: 'Summary' },
    fullProfile: { tr: 'Profilin tamamı', en: 'Full profile' },
  },
  forces: {
    heading: { tr: 'Bileşke sıfır değil.', en: "The net force isn't zero." },
    list: { tr: 'Beni etkileyenler', en: 'What has acted on me' },
    figure: { tr: 'Şekil 1', en: 'Fig. 1' },
    caption: {
      tr: 'Etkilerin kuvvet poligonu. Vektörler kronolojik sırayla uç uca eklenmiştir; yön ve büyüklükler kavramsal temsildir, ölçülmüş kuvvet değildir. Toplama sırası bileşkeyi değiştirmez.',
      en: "Force polygon of the influences. Vectors are added tip to tail in chronological order; directions and magnitudes are conceptual, not measured forces. The order of addition doesn't change the resultant.",
    },
    figAlt: {
      tr: '{Count} etkinin vektörel toplamı; bileşke otomotiv, savunma, mekanik tasarım ve imalata yöneliyor.',
      en: 'Vector sum of {count} influences; the resultant points toward automotive, defense, mechanical design and manufacturing.',
    },
    result: { tr: 'Bileşke R', en: 'Resultant R' },
    resultText: {
      tr: '{interests}',
      en: '{interests}',
    },
    angle: { tr: 'Yön', en: 'Direction' },
    reverse: { tr: 'Sırayı ters çevir', en: 'Reverse order' },
    reverseLabel: {
      tr: 'Vektörlerin toplanma sırasını ters çevir; bileşke değişmez',
      en: 'Reverse the order in which the vectors are added; the resultant does not change',
    },
    partial: { tr: 'Kısmi bileşke', en: 'Partial resultant' },
    reversedNote: { tr: 'ters sırayla toplandı', en: 'added in reverse order' },
    note: {
      tr: 'Vektörler kavramsal temsildir; ölçülmüş kuvvetler değildir.',
      en: 'Vectors are conceptual; they are not measured forces.',
    },
  },
  workshop: {
    heading: { tr: 'Çizimdeki ölçü, atölyede sınanır.', en: 'A dimension on paper gets tested on the shop floor.' },
    internship: { tr: 'Staj', en: 'Internship' },
    role: { tr: '{role}', en: '{role}' }, // internship record
    duration: { tr: '{duration}', en: '{duration}' },
    place: { tr: '{place}', en: '{place}' },
    applied: { tr: 'Uyguladım', en: 'I applied' },
    observed: { tr: 'Gözlemledim', en: 'I observed' },
    appliedHint: { tr: 'Kendi ellerimle yaptığım işler', en: 'Work I carried out myself' },
    observedHint: { tr: 'Yakından izlediğim süreçler', en: 'Processes I watched at close range' },
  },
  approach: {
    heading: { tr: 'Önce mesnetler, sonra yükler.', en: 'Supports first, then loads.' },
    interests: { tr: 'İlgi duyduğum konular', en: "Topics I'm drawn to" },
    figure: { tr: 'Şekil 2', en: 'Fig. 2' },
    hint: { tr: 'Yükü siz koyun, tepkiyi kiriş versin.', en: 'You place the load. The beam answers.' },
    caption: {
      tr: 'Basit mesnetli kiriş, tekil yük P. Yükü sürükleyin ya da cetveli kullanın; tepkiler, moment ve çökme aynı denklemlerden hesaplanır.',
      en: 'Simply supported beam with a point load P. Drag the load or use the ruler; reactions, moment and deflection all come from the same equations.',
    },
    exaggeration: {
      tr: "Çökme çizimi abartılmıştır: yük ortadayken δ₀, açıklığın yaklaşık %{scaleDesktop}'i (mobilde %{scaleMobile}'i) kadar çizilir. Şekil ve oranlar doğrudur; mutlak büyüklük görseldir. Okuma değerleri gerçek normalize oranlardır.",
      en: 'The drawn deflection is exaggerated: with the load at midspan, δ₀ is drawn at about {scaleDesktop}% of the span ({scaleMobile}% on mobile). Shape and proportions are correct; absolute size is visual. The readouts are true normalized ratios.',
    },
    figAlt: {
      tr: 'Basit mesnetli kiriş: sol ucta pim, sağ ucta rulo mesnet; kırmızı yük P hareket ettirilebilir. Altta mesnet tepkileri, eğilme momenti diyagramı ve yük konumu cetveli bulunur.',
      en: 'Simply supported beam: pin at the left, roller at the right, with a movable red load P. Below are the support reactions, a bending moment diagram and a load-position ruler.',
    },
    readoutsAt: { tr: 'Okuma değerleri, a = {a} L', en: 'Readouts, a = {a} L' },
    valueText: {
      tr: 'Yük sol mesnetten {a} L uzakta. Sol tepki {ra} P, sağ tepki {rb} P.',
      en: 'Load {a} L from the left support. Left reaction {ra} P, right reaction {rb} P.',
    },
    reset: { tr: 'Sıfırla', en: 'Reset' },
    resetLabel: {
      tr: 'Yükü varsayılan konuma ({a0} L) döndür',
      en: 'Return the load to the default position ({a0} L)',
    },
    readouts: { tr: 'Okuma değerleri', en: 'Readouts' },
    equations: { tr: 'Denklemler', en: 'Equations' },
    assumptionsTitle: { tr: 'Varsayımlar', en: 'Assumptions' },
    assumptions: {
      tr: 'Doğrusal elastik, homojen, prizmatik kesit. Küçük yer değiştirme; kayma deformasyonu ve öz ağırlık ihmal edilir.',
      en: 'Linear elastic, homogeneous, prismatic section. Small displacements; shear deformation and self-weight are neglected.',
    },
    load: { tr: 'yük', en: 'load' },
    controls: { tr: 'Yük konumu', en: 'Load position' },
    momentLabel: { tr: 'Eğilme momenti', en: 'Bending moment' },
    maxSub: { tr: 'maks', en: 'max' },
  },
  work: {
    heading: shared.work,
    projects: { tr: 'Projeler', en: 'Projects' },
    notes: { tr: 'Notlar', en: 'Notes' },
    emptyProjects: shared.emptyProjectsTitle,
    emptyProjectsText: shared.emptyProjectsText,
    emptyNotes: shared.emptyNotes,
    allNotes: shared.allNotes,
    toProfile: shared.profile,
    drawnBy: { tr: 'Çizen', en: 'Drawn by' },
    status: { tr: 'Durum', en: 'Status' },
    statusValue: shared.inPreparation,
    rev: shared.rev,
  },
  projects: {
    metaTitle: { tr: 'Projeler — {name}', en: 'Projects — {name}' },
    metaDescription: {
      tr: "{name}'ın mühendislik projeleri arşivi: çizimler, hesaplar ve tasarım çalışmaları.",
      en: "{name}'s engineering project archive: drawings, calculations and design work.",
    },
    eyebrow: { tr: 'Arşiv', en: 'Archive' },
    title: { tr: 'Projeler', en: 'Projects' },
    lead: {
      tr: 'Çizimler, hesaplar ve tasarım çalışmaları; belgelendikçe, kendi notlarımla birlikte.',
      en: 'Drawings, calculations and design work — added as it is documented, with my own notes.',
      approved: false,
    },
    emptyTitle: shared.emptyProjectsTitle,
    emptyText: shared.emptyProjectsText,
    toProfile: shared.profile,
    statusPreparing: shared.inPreparation,
    legendHeading: { tr: 'Her kayıt şunları taşıyacak', en: 'Each record will carry' },
    legend: [
      { tr: 'Yıl ve durum', en: 'Year and status' },
      { tr: 'Proje türü', en: 'Project type' },
      { tr: 'Mühendislik disiplini', en: 'Engineering discipline' },
      { tr: 'Kullanılan araçlar', en: 'Tools used' },
    ] satisfies Copy[],
    featured: { tr: 'Öne çıkan', en: 'Featured' },
    other: { tr: 'Tüm kayıtlar', en: 'All records' },
    all: { tr: 'Tümü', en: 'All' },
    filterKind: { tr: 'Tür', en: 'Type' },
    filterDiscipline: { tr: 'Disiplin', en: 'Discipline' },
    filterGroup: { tr: 'Kayıtları filtrele', en: 'Filter records' },
    noMatch: { tr: 'Bu seçimle eşleşen kayıt yok.', en: 'No records match this selection.' },
    view: { tr: 'Projeyi incele', en: 'View project' },
    back: { tr: 'Tüm projeler', en: 'All projects' },
    next: { tr: 'Sonraki proje', en: 'Next project' },
    related: { tr: 'İlgili projeler', en: 'Related projects' },
    fixtureLabel: {
      tr: 'Geliştirme örneği — gerçek proje değildir',
      en: 'Development sample — not a real project',
    },
    fixtureShort: { tr: 'Geliştirme örneği', en: 'Dev sample' },
    // title-block cells
    kind: { tr: 'Tür', en: 'Type' },
    context: { tr: 'Bağlam', en: 'Context' },
    period: { tr: 'Dönem', en: 'Period' },
    year: { tr: 'Yıl', en: 'Year' },
    tools: { tr: 'Araçlar', en: 'Tools' },
    materials: { tr: 'Malzeme', en: 'Material' },
    revision: { tr: 'Revizyon', en: 'Revision' },
    status: { tr: 'Durum', en: 'Status' },
    discipline: { tr: 'Disiplin', en: 'Discipline' },
    // body sections
    objective: { tr: 'Problem ve amaç', en: 'Problem and objective' },
    process: { tr: 'Tasarım süreci', en: 'Design process' },
    methodology: { tr: 'Mühendislik yöntemi', en: 'Engineering method' },
    measurements: { tr: 'Doğrulanmış hesaplar ve ölçümler', en: 'Verified calculations and measurements' },
    figures: { tr: 'Şekiller', en: 'Figures' },
    preview3d: { tr: '3B önizleme', en: '3D preview' },
    results: { tr: 'Sonuçlar', en: 'Results' },
    conclusions: { tr: 'Değerlendirme', en: 'Conclusions' },
    revisions: { tr: 'Revizyonlar', en: 'Revisions' },
    calculations: { tr: 'Mühendislik hesapları', en: 'Engineering calculations' },
    calcGiven: { tr: 'Verilenler', en: 'Given' },
    calcRequired: { tr: 'İstenen', en: 'Required' },
    calcAssumptions: { tr: 'Kabuller', en: 'Assumptions' },
    calcMethod: { tr: 'Yöntem', en: 'Method' },
    calcResult: { tr: 'Doğrulanmış sonuç', en: 'Verified result' },
    decisions: { tr: 'Tasarım kararı', en: 'Design decision' },
    decisionAlternative: { tr: 'Alternatif', en: 'Alternative' },
    decisionSelected: { tr: 'Seçilen', en: 'Selected' },
    decisionRationale: { tr: 'Gerekçe', en: 'Rationale' },
    learnings: { tr: 'Çıkarılan dersler', en: 'Learnings' },
    revisionReason: { tr: 'Gerekçe', en: 'Reasoning' },
    viewer: {
      activate: { tr: '3B modeli yükle ve incele', en: 'Load and explore the 3D model' },
      hint: {
        tr: 'Model, siz isteyene kadar yüklenmez. Yüklendikten sonra döndürebilir ve yakınlaştırabilirsiniz.',
        en: 'The model is not loaded until you ask. Once loaded you can rotate and zoom it.',
      },
      instructions: {
        tr: 'Sürükleyerek döndürün; fare tekerleği veya iki parmakla yakınlaştırın. Klavye: ok tuşları döndürür, + ve − yakınlaştırır, 0 sıfırlar. Mobilde sayfayı kaydırmak için modelin dışında kaydırın.',
        en: 'Drag to rotate; mouse wheel or two fingers to zoom. Keyboard: arrow keys rotate, + and − zoom, 0 resets. On mobile, scroll the page by swiping outside the model.',
      },
      loading: { tr: 'Model yükleniyor…', en: 'Loading model…' },
      errorTitle: { tr: '3B model yüklenemedi.', en: 'The 3D model could not be loaded.' },
      errorText: {
        tr: 'Bağlantıyı veya tarayıcının WebGL desteğini kontrol edin. Önizleme görseli yukarıda duruyor.',
        en: "Check your connection or the browser's WebGL support. The preview image is shown above.",
      },
      retry: { tr: 'Yeniden dene', en: 'Try again' },
      reset: { tr: 'Görünümü sıfırla', en: 'Reset view' },
      zoomIn: { tr: 'Yakınlaştır', en: 'Zoom in' },
      zoomOut: { tr: 'Uzaklaştır', en: 'Zoom out' },
      rotateLeft: { tr: '← Sola', en: '← Left' },
      rotateRight: { tr: 'Sağa →', en: 'Right →' },
      rotateUp: { tr: '↑ Yukarı', en: '↑ Up' },
      rotateDown: { tr: 'Aşağı ↓', en: 'Down ↓' },
      canvas: { tr: '3B model görüntüleyici', en: '3D model viewer' },
      demo: { tr: 'GELİŞTİRME ÖRNEĞİ', en: 'DEVELOPMENT DEMO' },
    },
    figure: { tr: 'Şekil', en: 'Figure' },
    rev: shared.rev,
    ctaHeading: { tr: 'Bu çalışma hakkında konuşmak ister misiniz?', en: 'Want to talk about this work?' },
    // gallery
    enlarge: { tr: 'Büyüt', en: 'Enlarge' },
    lightbox: { tr: 'Şekil görüntüleyici', en: 'Figure viewer' },
    prev: { tr: 'Önceki şekil', en: 'Previous figure' },
    nextFigure: { tr: 'Sonraki şekil', en: 'Next figure' },
    of: { tr: '/', en: '/' },
    watchVideo: { tr: 'Videoyu izle', en: 'Watch video' },
    external: { tr: 'yeni sekmede açılır', en: 'opens in a new tab' },
    kinds: {
      'cad-assembly': { tr: 'CAD montajı', en: 'CAD assembly' },
      'single-part': { tr: 'Tekil parça', en: 'Single part' },
      fabrication: { tr: 'İmalat çalışması', en: 'Fabrication' },
      'lab-experiment': { tr: 'Laboratuvar deneyi', en: 'Lab experiment' },
      'design-study': { tr: 'Tasarım çalışması', en: 'Design study' },
      calculation: { tr: 'Mühendislik hesabı', en: 'Engineering calculation' },
      documentation: { tr: 'Teknik dokümantasyon', en: 'Technical documentation' },
    } satisfies Record<ProjectKind, Copy>,
    contexts: {
      academic: { tr: 'Akademik (ders)', en: 'Academic (course)' },
      independent: { tr: 'Bağımsız', en: 'Independent' },
      internship: { tr: 'Staj', en: 'Internship' },
      professional: { tr: 'Profesyonel', en: 'Professional' },
    } satisfies Record<ProjectContext, Copy>,
    statuses: {
      completed: { tr: 'Tamamlandı', en: 'Completed' },
      'in-progress': { tr: 'Devam ediyor', en: 'In progress' },
    } satisfies Record<ProjectStatus, Copy>,
    disciplines: {
      'machine-design': { tr: 'Makine tasarımı', en: 'Machine design' },
      'strength-of-materials': { tr: 'Mukavemet', en: 'Strength of materials' },
      'statics-dynamics': { tr: 'Statik ve dinamik', en: 'Statics and dynamics' },
      manufacturing: { tr: 'İmalat', en: 'Manufacturing' },
      materials: { tr: 'Malzeme bilimi', en: 'Materials' },
      thermofluids: { tr: 'Termodinamik ve akışkanlar', en: 'Thermofluids' },
      'cad-modelling': { tr: 'CAD modelleme', en: 'CAD modelling' },
    } satisfies Record<Discipline, Copy>,
  },
  notFound: {
    title: { tr: 'Sayfa bulunamadı', en: 'Page not found' },
    text: {
      tr: 'Aradığınız sayfa yok ya da yayımlanmamış.',
      en: "The page you're looking for doesn't exist or isn't published.",
    },
  },
  direction: {
    heading: { tr: 'Henüz bir sonuç değil; bir yön.', en: 'Not a result yet — a direction.' },
    figure: { tr: 'Bileşke yönü', en: 'Resultant direction' },
  },
  contact: {
    heading: shared.contact,
    lead: {
      tr: 'Staj, proje ya da yalnızca bir soru: en hızlı yol e-posta.',
      en: 'Internships, projects or just a question — email is the quickest way.',
    },
    copy: shared.copy,
    copied: shared.copied,
    copyFailed: shared.copyFailed,
    copyLabel: { tr: 'E-posta adresini kopyala', en: 'Copy email address' },
    linkedin: { tr: "LinkedIn'de bağlantı kurun", en: 'Connect on LinkedIn' },
    also: { tr: 'Ayrıca', en: 'Also' },
    external: { tr: 'yeni sekmede açılır', en: 'opens in a new tab' },
  },
  footer: {
    sentence: {
      tr: 'Mekaniğin temellerini ölçerek, çizerek ve sınayarak öğreniyorum.',
      en: "I'm learning the fundamentals of mechanics by measuring, drawing and testing.",
    },
    drawnBy: { tr: 'Çizen', en: 'Drawn by' },
    sheet: { tr: 'Pafta', en: 'Sheet' },
    language: { tr: 'Dil', en: 'Language' },
    contact: { tr: 'İletişim', en: 'Contact' },
    links: { tr: 'Bağlantılar', en: 'Links' },
    revision: { tr: 'Son revizyon', en: 'Last revision' },
    rights: { tr: '© {year} {name}', en: '© {year} {name}' },
  },
  langNames: { tr: 'Türkçe', en: 'English' },
};

export const resolveDict = (tk: TokenSet): typeof dictTemplate => resolve(dictTemplate, tk);
export const dict = resolveDict({ tr: tokens('tr'), en: tokens('en') });
