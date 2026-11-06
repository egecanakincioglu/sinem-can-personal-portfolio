import { describe, expect, it } from 'vitest';
import { railLabels, screens } from './screens';

describe('railLabels', () => {
  it('uses the first letters of the first two words, or the first two letters of a single word', () => {
    expect(railLabels(['Genel bakış', 'Ana sayfa', 'Notlar', 'Yayın'])).toEqual(['GB', 'AS', 'NO', 'YA']);
  });

  it('skips the conjunctions "ve" and "&"', () => {
    expect(railLabels(['Kapsam ve Matris', 'Arlo & Gece'])).toEqual(['KM', 'AG']);
  });

  it('uses a first word of exactly two characters whole', () => {
    expect(railLabels(['3B ve CAD', 'ab cd'])).toEqual(['3B', 'AB']);
  });

  it('upper-cases with Turkish rules', () => {
    expect(railLabels(['ışık', 'iyi'])).toEqual(['IŞ', 'İY']);
  });

  it('breaks a collision with the first letter plus the next free consonant', () => {
    expect(railLabels(['Profil', 'Projeler'])).toEqual(['PR', 'PJ']);
    expect(railLabels(['Profil', 'Proje', 'Prefix'])).toEqual(['PR', 'PJ', 'PF']);
  });

  it('gives every screen two capitals and a unique label', () => {
    const labels = screens.map((s) => s.short);
    expect(labels).toEqual(['GB', 'AS', 'PR', 'PJ', 'NO', 'ME', '3B', 'AM', 'SA', 'YA', 'KM']);
    expect(new Set(labels).size).toBe(labels.length);
    for (const l of labels) expect(l).toBe(l.toLocaleUpperCase('tr'));
  });
});
