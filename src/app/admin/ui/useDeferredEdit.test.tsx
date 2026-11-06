import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { TextField } from './controls';

afterEach(cleanup);

function Harness({ onStore }: { onStore?: (v: string) => void }) {
  const [stored, setStored] = useState('start');
  return (
    <>
      <TextField
        name="x"
        meta={{ label: 'Alan' }}
        value={stored}
        onChange={(v) => {
          setStored(v);
          onStore?.(v);
        }}
      />
      <button type="button" onClick={() => setStored('from elsewhere')}>
        external
      </button>
    </>
  );
}

const input = () => screen.getByLabelText(/Alan/) as HTMLInputElement;

describe('TextField', () => {
  it('shows the typed text and hands it to onChange', () => {
    const seen: string[] = [];
    render(<Harness onStore={(v) => seen.push(v)} />);
    fireEvent.change(input(), { target: { value: 'start!' } });
    expect(input().value).toBe('start!');
    expect(seen).toEqual(['start!']);
  });

  it('follows the stored value when it changes from outside', () => {
    render(<Harness />);
    fireEvent.change(input(), { target: { value: 'typed' } });
    act(() => screen.getByRole('button', { name: 'external' }).click());
    expect(input().value).toBe('from elsewhere');
  });

  it('keeps showing the typed text while the store ignores it', () => {
    function Pinned() {
      return <TextField name="x" meta={{ label: 'Alan' }} value="pinned" onChange={() => {}} />;
    }
    render(<Pinned />);
    fireEvent.change(input(), { target: { value: 'other' } });
    expect(input().value).toBe('pinned');
  });

  it('does not change a read-only control', () => {
    render(<TextField name="x" meta={{ label: 'Alan', derived: true }} value="fixed" onChange={() => {}} />);
    expect(input().readOnly).toBe(true);
    expect(input().value).toBe('fixed');
  });
});
