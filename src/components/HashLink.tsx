'use client';

import type { ComponentProps } from 'react';

/** Language switch link: the equivalent page gets the current #hash (ids are language-neutral). */
export function HashLink({ href, ...rest }: ComponentProps<'a'> & { href: string }) {
  return (
    <a
      {...rest}
      href={href}
      onClick={(e) => {
        e.currentTarget.href = `${href}${window.location.hash}`;
      }}
    />
  );
}
