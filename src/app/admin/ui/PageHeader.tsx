import type { ReactNode } from 'react';

/** Screen title block inside the editor: the page's single h1. */
export function PageHeader({
  kicker,
  title,
  lede,
  aside,
}: {
  kicker?: string;
  title: string;
  lede?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="a-ph">
      <div>
        {kicker && <p className="a-ph-k">{kicker}</p>}
        <h1 className="a-ph-t">{title}</h1>
        {lede && <p className="a-ph-l">{lede}</p>}
      </div>
      {aside && <div className="a-ph-aside">{aside}</div>}
    </div>
  );
}

/** Editor section: Newsreader heading over hairline-separated records; target of the section index. */
export function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={`bolum-${id}`} className="a-sec" aria-labelledby={`bolum-${id}-h`}>
      <header className="a-sec-head">
        <h2 id={`bolum-${id}-h`} className="a-sec-t">
          {title}
        </h2>
        {note && <div className="a-sec-n">{note}</div>}
      </header>
      <div className="a-sec-body">{children}</div>
    </section>
  );
}
