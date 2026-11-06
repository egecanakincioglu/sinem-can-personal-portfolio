import { notFound } from 'next/navigation';

/** SERVER-SIDE gate. Admin is a development-only prototype: any NODE_ENV other than
 *  "development" (production, test) answers 404. Called by the root layout AND every page. */
export function assertDevOnly(): void {
  if (process.env.NODE_ENV !== 'development') notFound();
}
