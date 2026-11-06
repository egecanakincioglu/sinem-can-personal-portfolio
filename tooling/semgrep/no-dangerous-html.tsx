declare function texToMathML(tex: string, display?: boolean): string;
declare function sanitize(value: string): string;

const bootScript = `window.__ready = true;`;
const bootText = 'ready';
let mutable = 'ready';
mutable = mutable + '!';

export function A({ html }: { html: string }) {
  // ruleid: no-dangerous-html
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export function B({ text }: { text: string }) {
  // ok: no-dangerous-html
  return <div>{text}</div>;
}

export function Math({ tex }: { tex: string }) {
  // ok: no-dangerous-html
  return <span dangerouslySetInnerHTML={{ __html: texToMathML(tex, true) }} />;
}

export function MathWithChildren({ tex }: { tex: string }) {
  // ok: no-dangerous-html
  return <span dangerouslySetInnerHTML={{ __html: texToMathML(tex) }}></span>;
}

export function StringLiteral() {
  // ok: no-dangerous-html
  return <div dangerouslySetInnerHTML={{ __html: '<b>static</b>' }} />;
}

export function PlainTemplate() {
  // ok: no-dangerous-html
  return <div dangerouslySetInnerHTML={{ __html: `<b>static</b>` }} />;
}

export function ConstTemplate() {
  // ok: no-dangerous-html
  return <script dangerouslySetInnerHTML={{ __html: bootScript }} />;
}

export function ConstString() {
  // ok: no-dangerous-html
  return <div dangerouslySetInnerHTML={{ __html: bootText }} />;
}

export function Member({ b }: { b: { svg: string } }) {
  // ruleid: no-dangerous-html
  return <div dangerouslySetInnerHTML={{ __html: b.svg }} />;
}

export function OtherCall({ html }: { html: string }) {
  // ruleid: no-dangerous-html
  return <div dangerouslySetInnerHTML={{ __html: sanitize(html) }} />;
}

export function Interpolated({ name }: { name: string }) {
  // ruleid: no-dangerous-html
  return <div dangerouslySetInnerHTML={{ __html: `<b>${name}</b>` }} />;
}

export function LetVariable() {
  // ruleid: no-dangerous-html
  return <div dangerouslySetInnerHTML={{ __html: mutable }} />;
}
