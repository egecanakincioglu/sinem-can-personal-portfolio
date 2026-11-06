export function A() {
  // ruleid: no-script-element
  return <script src="/x.js" />;
}

export function B() {
  // ruleid: no-script-element
  return <script>{'x'}</script>;
}

export function C() {
  // ok: no-script-element
  return <div />;
}

export function D() {
  // ok: no-script-element
  return <script dangerouslySetInnerHTML={{ __html: 'x' }} />;
}

export function E() {
  // ok: no-script-element
  return <script type="application/json" dangerouslySetInnerHTML={{ __html: 'x' }} />;
}

export function F() {
  // ruleid: no-script-element
  return <script src="/x.js" dangerouslySetInnerHTML={{ __html: 'x' }} />;
}

export function G() {
  // ruleid: no-script-element
  return <script dangerouslySetInnerHTML={{ __html: 'x' }}>y</script>;
}
