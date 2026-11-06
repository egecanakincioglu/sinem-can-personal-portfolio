import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Intro } from './Sections.tsx';

afterEach(cleanup);

describe('Intro', () => {
  it('keeps only term and description groups directly inside the summary list', () => {
    const { container } = render(<Intro locale="en" />);
    const list = container.querySelector('dl');
    expect(list).not.toBeNull();
    for (const child of Array.from(list!.children)) {
      expect(child.tagName).toBe('DIV');
      expect(Array.from(child.children).map((c) => c.tagName)).toEqual(['DT', 'DD']);
    }
  });
});
