// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BilingualField, ListEditor, MoveButtons, RecordRow, RemoveButton, Segmented, TextField } from './controls';

afterEach(cleanup);

describe('Segmented', () => {
  it('shows the group name and keeps the full accessible name', () => {
    render(
      <Segmented
        label="egitim: Dönem duyarlığı"
        title="Dönem duyarlığı"
        value="year"
        options={[
          { value: 'year', label: 'Yıl' },
          { value: 'month', label: 'Ay' },
        ]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('Dönem duyarlığı')).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: 'egitim: Dönem duyarlığı' })).toBeTruthy();
  });

  it('falls back to the accessible name as the visible text', () => {
    render(<Segmented label="Durum" value="a" options={[{ value: 'a', label: 'A' }]} onChange={() => {}} />);
    expect(screen.getByText('Durum')).toBeTruthy();
  });
});

describe('BilingualField', () => {
  const setup = (extra: Partial<Parameters<typeof BilingualField>[0]> = {}) =>
    render(<BilingualField name="f" label="Başlık" tr="a" en="" onTr={() => {}} onEn={() => {}} max={20} {...extra} />);

  it('shows the field name once and names each input for assistive technology', () => {
    setup();
    expect(screen.getAllByText('Başlık')).toHaveLength(1);
    expect(screen.getByLabelText('Başlık · TR')).toBeTruthy();
    expect(screen.getByLabelText('Başlık · EN')).toBeTruthy();
  });

  it('places the language tabs in the heading row and keeps the group name short', () => {
    setup();
    const group = screen.getByRole('group', { name: 'Başlık' });
    expect(within(group).getByRole('tablist')).toBeTruthy();
  });

  it('does not announce counters', () => {
    setup();
    expect(document.querySelector('.a-count[aria-live], .a-count[role="status"]')).toBeNull();
  });
});

describe('TextField', () => {
  it('shows a counter only when one is given', () => {
    const { rerender } = render(
      <TextField name="d" value="2026-11" onChange={() => {}} meta={{ label: 'Başlangıç (YYYY-AA)' }} />,
    );
    expect(document.querySelector('.a-count')).toBeNull();
    rerender(
      <TextField
        name="d"
        value="2026-11"
        onChange={() => {}}
        meta={{ label: 'Başlangıç', counter: { value: 7, max: 40 } }}
      />,
    );
    expect(screen.getByText('7 / 40')).toBeTruthy();
  });

  it('grows a multiline field to its content', () => {
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(240);
    render(<TextField name="m" multiline value="a\nb" onChange={() => {}} meta={{ label: 'Metin' }} />);
    expect((screen.getByLabelText('Metin') as HTMLTextAreaElement).style.height).toBe('240px');
    scroll.mockRestore();
  });
});

describe('record controls', () => {
  it('uses one remove control with the word and a cross, and confirms before removing', () => {
    const onRemove = vi.fn();
    render(
      <ul>
        <RecordRow index={0} itemLabel="Etiket" onRemove={onRemove}>
          <span>x</span>
        </RecordRow>
      </ul>,
    );
    fireEvent.click(screen.getByRole('button', { name: "Etiket 1'i kaldır" }));
    expect(onRemove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Evet' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('keeps the visible word in the accessible name', () => {
    const click = vi.fn();
    render(<RemoveButton onClick={click} />);
    fireEvent.click(screen.getByRole('button', { name: 'Kaldır' }));
    expect(click).toHaveBeenCalled();
  });

  it('disables a move button that has no handler', () => {
    render(<MoveButtons label="Paragraf 1'i" onDown={() => {}} />);
    expect((screen.getByRole('button', { name: "Paragraf 1'i yukarı taşı" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: "Paragraf 1'i aşağı taşı" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('does not announce the list count', () => {
    render(
      <ListEditor label="Etiketler" min={0} max={3} count={1} onAdd={() => {}}>
        <li>x</li>
      </ListEditor>,
    );
    expect(screen.getByText('1 / 3').getAttribute('role')).toBeNull();
  });
});
