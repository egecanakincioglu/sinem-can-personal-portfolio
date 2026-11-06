import { assertDevOnly } from '../../guard';
import { HomeEditor } from './HomeEditor';
import { dict } from '@/content/dictionary';
import { beam, draft, forceRecords, identity, interests } from '@/content/site';
import { num } from '@/lib/format';
import { getPublicProjects } from '@/lib/projects';
import { beamMaxMidspanOffset, resultant } from '@/lib/physics';

const pair = (c: { tr: string; en: string }) => ({ tr: c.tr, en: c.en });

/** Canonical owner of the linked parts of each influence record. */
const forceSource: Record<string, string> = {
  F1: 'Eğitim › İMKB (lise)',
  F2: 'Takım sporları (bu kayda özgü)',
  F3: 'Eğitim › Doğuş Üniversitesi',
  F4: 'Topluluk › IEEE',
  F5: 'Laboratuvar ve CAD (bu kayda özgü)',
  F6: 'Deneyim › Ferre | Femas Group',
};

export default async function HomeScreen({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  assertDevOnly();
  const sp = await searchParams;
  // Only published + approved records can be chosen as featured (getPublicProjects applies the same filter as the public site).
  const projects = getPublicProjects({ includeFixtures: sp.fixtures === '1' }).map((p) => ({
    id: p.id,
    title: { tr: p.title.tr, en: p.title.en },
  }));
  const h = dict.hero;
  return (
    <HomeEditor
      seed={{
        hero: {
          copy: {
            isolation: pair(h.isolation),
            lead: pair(draft.heroLead),
            note: pair(draft.isolationNote),
            whatIs: pair(h.whatIs),
            briefly: pair(h.briefly),
            program: pair(h.program),
            university: pair(h.university),
            graduation: pair(h.graduation),
            internship: pair(h.internship),
            direction: pair(h.direction),
            resultantAlt: pair(h.resultantAlt),
          },
          identity: { firstName: identity.firstName, lastName: identity.lastName },
          derived: {
            meta1: pair(h.meta1),
            meta2: pair(h.meta2),
            program: pair(h.programValue),
            university: pair(h.universityValue),
            graduation: pair(h.graduationValue),
            internship: pair(h.internshipValue),
            theta: Math.round(resultant(forceRecords).angleDeg),
          },
        },
        forces: {
          records: forceRecords.map((r) => ({
            id: r.id,
            magnitude: r.magnitude,
            angleDeg: r.angleDeg,
            short: pair(r.short),
            period: pair(r.period),
            title: pair(r.title),
            text: pair(r.text),
            source: forceSource[r.id],
          })),
          copy: {
            forcesHeading: pair(dict.forces.heading),
            forcesText: pair(draft.forcesText),
            forcesList: pair(dict.forces.list),
            forcesResult: pair(dict.forces.result),
            forcesPartial: pair(dict.forces.partial),
            forcesReverse: pair(dict.forces.reverse),
          },
          locked: { caption: pair(dict.forces.caption), note: pair(dict.forces.note) },
        },
        beam: {
          copy: {
            beamHeading: pair(dict.approach.heading),
            beamInterests: pair(dict.approach.interests),
            beamHint: pair(dict.approach.hint),
            beamFigure: pair(dict.approach.figure),
            beamCaption: pair(dict.approach.caption),
            beamTeaching: pair(draft.beamTeaching),
            beamMoment: pair(dict.approach.momentLabel),
            beamEquations: pair(dict.approach.equations),
            beamReadoutsAt: pair(dict.approach.readoutsAt),
            beamReset: pair(dict.approach.reset),
            beamControls: pair(dict.approach.controls),
            beamFigAlt: pair(dict.approach.figAlt),
            beamValueText: pair(dict.approach.valueText),
            beamResetLabel: pair(dict.approach.resetLabel),
          },
          protectedCopy: {
            exaggeration: pair(dict.approach.exaggeration),
            assumptionsTitle: pair(dict.approach.assumptionsTitle),
            assumptions: pair(dict.approach.assumptions),
          },
          offset: { tr: num(beamMaxMidspanOffset(), 'tr', 3), en: num(beamMaxMidspanOffset(), 'en', 3) },
          scale: beam.deflectionScale,
        },
        lead: draft.statement,
        interests: interests.map((i) => ({ tr: i.tr, en: i.en })),
        projects,
      }}
    />
  );
}
