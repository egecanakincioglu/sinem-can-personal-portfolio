import type { SiteContentOverride } from '../site-content';

/**
 * DEVELOPMENT ONLY. A representative `SiteContentOverride` for the /dev-preview/home harness, used to prove that
 * the Homepage renders injected content without touching the authoritative modules. Every string carries the
 * marker "§" so an override is unmistakable in the rendered page. Never imported by a public route.
 */
/** @public Loaded by path in development. */
export const sampleOverride: SiteContentOverride = {
  identity: { firstName: 'Önizle§', lastName: 'DENEME§' },
  contact: { email: 'override§@example.test' },
  interests: [
    { tr: 'Robotik§', en: 'Robotics§' },
    { tr: 'Malzeme§', en: 'Materials§' },
  ],
  academicInterests: [{ tr: 'Titreşim§', en: 'Vibration§' }],
  draft: {
    heroLead: { tr: 'Hero cümlesi geçersiz kılındı§.', en: 'Hero lead overridden§.' },
    beamTeaching: { tr: 'Kiriş cümlesi§.', en: 'Beam sentence§.' },
  },
  dict: {
    work: { emptyProjects: { tr: 'Boş durum başlığı§', en: 'Empty title§' } },
    forces: { heading: { tr: 'Kuvvetler§', en: 'Forces§' } },
    approach: { heading: { tr: 'Yaklaşım§', en: 'Approach§' } },
  },
  // Same six records, same ids and order. Labels, descriptions and vector inputs only.
  forceRecords: [
    { id: 'F1', title: { tr: 'Birinci§', en: 'First§' }, magnitude: 2, angleDeg: 10 },
    { id: 'F2', text: { tr: 'Açıklama değişti§', en: 'Description changed§' } },
    { id: 'bogus', magnitude: 99 },
  ],
  beam: { defaultLoad: 0.5 },
  portrait: null,
};
