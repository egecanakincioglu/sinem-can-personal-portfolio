import Link from 'next/link';
import { dict } from '@/content/dictionary';
import { ownerName } from '@/content/site';

// Bilingual on purpose: Next gives a not-found boundary no route params, so the visitor's language is unknown here.
export default function NotFound() {
  const n = dict.notFound;
  return (
    <main id="main" className="shell flex min-h-dvh flex-col justify-center py-32">
      <p className="t-meta">404</p>
      <h1 className="t-display-l mt-4 max-w-[14ch]">
        <span lang="tr">{n.title.tr}</span>
        <span className="mt-2 block text-kursun" lang="en">
          {n.title.en}
        </span>
      </h1>
      <p className="mt-6 max-w-[40ch] text-kursun">
        <span lang="tr">{n.text.tr}</span>
        <br />
        <span lang="en">{n.text.en}</span>
      </p>
      <nav aria-label={ownerName} className="mt-8 flex flex-wrap gap-x-8">
        <Link href="/tr" hrefLang="tr" className="ulink inline-flex min-h-11 items-center font-medium">
          Türkçe
        </Link>
        <Link href="/en" hrefLang="en" className="ulink inline-flex min-h-11 items-center font-medium">
          English
        </Link>
      </nav>
    </main>
  );
}
