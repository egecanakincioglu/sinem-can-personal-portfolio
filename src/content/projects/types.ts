import type { Copy, Locale, Period } from '../types';

/* ------------------------------------------------------------------------------------------------
   Project content model.
   Presentation never reads these records directly: pages go through lib/projects.ts, which decides
   what is public and strips private fields before anything reaches a component.
   ------------------------------------------------------------------------------------------------ */

export type ProjectKind =
  'cad-assembly' | 'single-part' | 'fabrication' | 'lab-experiment' | 'design-study' | 'calculation' | 'documentation';

export type ProjectContext = 'academic' | 'independent' | 'internship' | 'professional';

export type ProjectStatus = 'completed' | 'in-progress';

export type Discipline =
  | 'machine-design'
  | 'strength-of-materials'
  | 'statics-dynamics'
  | 'manufacturing'
  | 'materials'
  | 'thermofluids'
  | 'cad-modelling';

/* ---------- media ---------- */

type MediaBase = {
  id: string;
  /** Meaningful, localised alternative text — required for every public image. */
  alt: Copy;
  /** Technical caption; figure numbers are generated from order, never stored. */
  caption?: Copy;
  /** Intrinsic size, used to reserve the exact aspect ratio (technical drawings are never cropped). */
  width: number;
  height: number;
  /** Crop focus (0–100) for cover crops on listings; ignored where the full image is shown. */
  focalX?: number;
  focalY?: number;
};

/** `src` is a browser-safe raster/vector image. It is never a CAD file. */
export type ImageMedia = MediaBase & { kind: 'image' | 'drawing' | 'diagram'; src: string };

/** Poster + an external page. No third-party embed is loaded automatically. */
type VideoMedia = MediaBase & { kind: 'video'; src: string; externalUrl: string };

type ProjectMedia = ImageMedia | VideoMedia;

/**
 * Browser-safe preview (e.g. an exported GLB) — NOT the editable original.
 * Rendered only when `approved`. The interactive viewer loads `modelSrc` (a public GLB) on user activation;
 * the poster is the fallback. `modelSrc` is a public preview URL, never an original CAD location.
 */
type Preview3D = {
  id: string;
  approved: boolean;
  poster: ImageMedia;
  /** Public, lightweight export (GLB/glTF). Meant to be served openly; originals never are. */
  modelSrc: string;
  sizeBytes?: number;
  caption?: Copy;
};

/**
 * Metadata about a private, editable original (SolidWorks, Siemens NX, STEP…).
 * Deliberately has NO url/path field: a file location must never live in public content.
 * `assetId` is an opaque key that a future server-side authorisation layer resolves.
 * `toPublicProject()` removes this whole list before data reaches any component or the client.
 */
type PrivateOriginal = {
  assetId: string;
  format: 'sldprt' | 'sldasm' | 'nx' | 'step' | 'iges' | 'other';
  label: Copy;
  sizeBytes?: number;
  access: 'private';
};

/* ---------- body content ---------- */

/** Only values Sinem has verified may carry a calculation/measurement; `verified: true` is required to render. */
type Measurement = {
  label: Copy;
  /** Formatted per locale (decimal comma in Turkish). */
  value: number;
  digits?: number;
  unit?: string;
  /** Short note: method, instrument or assumption. */
  note?: Copy;
  verified: true;
};

/** `reasoning` and `date` are optional: nothing is invented when Sinem has not recorded them. */
type Revision = { rev: string; date?: string; note: Copy; reasoning?: Copy };

/** One quantity of a calculation. Only values Sinem has verified; units are carried separately. */
type CalcQuantity = { symbol?: string; label: Copy; value: number; digits?: number; unit?: string };

/** Engineering calculation record: given → required → assumptions → method → verified result. */
type Calculation = {
  id: string;
  title: Copy;
  given?: CalcQuantity[];
  required?: Copy[];
  assumptions?: Copy[];
  method?: Copy[];
  /** Rendered only when present; `verified: true` is required, as for `Measurement`. */
  result?: CalcQuantity & { verified: true; note?: Copy };
};

/** Design decision: alternatives judged against criteria with evidence, ending in a rationale. No scores. */
type DesignDecision = {
  id: string;
  title: Copy;
  criteria?: Copy[];
  alternatives: {
    name: Copy;
    /** One evidence/tradeoff note per criterion (same order as `criteria`); entries may be omitted. */
    evidence?: (Copy | undefined)[];
    selected?: boolean;
  }[];
  rationale?: Copy;
};

/* ---------- record ---------- */

type ProjectBase = {
  /** Stable identifier: never changes when titles or slugs do. */
  id: string;
  /** One slug per locale, so the language switch can land on the equivalent page. */
  slug: Record<Locale, string>;
  title: Copy;
  subtitle?: Copy;
  kind: ProjectKind;
  disciplines: Discipline[];
  status: ProjectStatus;
  context?: ProjectContext;
  period?: Period;
  featured?: boolean;
  /** Hero composition. Falls back to "text" when the media it needs is absent. */
  hero?: 'render' | 'figure' | 'text';
  cover?: ImageMedia;
  tools?: string[];
  materials?: Copy[];
  objective?: Copy[];
  process?: Copy[];
  methodology?: Copy[];
  measurements?: Measurement[];
  calculations?: Calculation[];
  decisions?: DesignDecision[];
  learnings?: Copy[];
  results?: Copy[];
  conclusions?: Copy[];
  figures?: ProjectMedia[];
  preview3d?: Preview3D;
  revisions?: Revision[];
  relatedIds?: string[];
  privateOriginals?: PrivateOriginal[];
  /** Development-only sample. Set by fixtures; such records can never be public in production. */
  fixture?: true;
};

/** Visible to visitors only when `approved` is literally true. */
type PublishedProject = ProjectBase & { visibility: 'published'; approved: boolean };
type DraftProject = ProjectBase & { visibility: 'draft' };
export type ProjectRecord = PublishedProject | DraftProject;

/** What components receive: the record without private CAD metadata. */
export type PublicProject = Omit<ProjectRecord, 'privateOriginals'>;
