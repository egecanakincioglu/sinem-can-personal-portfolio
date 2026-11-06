import { describe, expect, it } from 'vitest';
import { capFirst, fill, fullDate, lower, monthYear, num, numberWord, periodText } from './format';

describe('num', () => {
  it('uses a decimal comma in Turkish and a point in English', () => {
    expect(num(3.14159, 'tr')).toBe('3,14');
    expect(num(3.14159, 'en')).toBe('3.14');
  });

  it('honours the digit count and groups thousands per locale', () => {
    expect(num(2, 'en', 0)).toBe('2');
    expect(num(0.5, 'tr', 3)).toBe('0,500');
    expect(num(1234.5, 'en')).toBe('1,234.50');
    expect(num(1234.5, 'tr')).toBe('1.234,50');
  });
});

describe('dates', () => {
  it('formats month and year in each locale', () => {
    expect(monthYear('2022-10-01', 'en')).toBe('October 2022');
    expect(monthYear('2022-10-01', 'tr')).toBe('Ekim 2022');
  });

  it('does not slip a month for midnight UTC dates', () => {
    expect(monthYear('2023-01-01', 'en')).toBe('January 2023');
  });

  it('formats a full date in each locale', () => {
    expect(fullDate('2024-03-05', 'en')).toBe('March 5, 2024');
    expect(fullDate('2024-03-05', 'tr')).toBe('5 Mart 2024');
  });

  it('builds period ranges with an en dash', () => {
    expect(periodText({ start: '2022-10-01', end: '2027-07-01', precision: 'month' }, 'en')).toBe(
      'October 2022 – July 2027',
    );
    expect(periodText({ start: '2017', end: '2021', precision: 'year' }, 'en')).toBe('2017 – 2021');
    expect(periodText({ start: '2022-10-01', precision: 'month' }, 'tr')).toBe('Ekim 2022 –');
  });
});

describe('text helpers', () => {
  it('lower-cases with Turkish dotted and dotless i rules', () => {
    expect(lower('MAKİNE', 'tr')).toBe('makine');
    expect(lower('IŞIK', 'tr')).toBe('ışık');
    expect(lower('TITLE', 'en')).toBe('title');
  });

  it('capitalises the first letter per locale', () => {
    expect(capFirst('ilk', 'tr')).toBe('İlk');
    expect(capFirst('ilk', 'en')).toBe('Ilk');
    expect(capFirst('', 'en')).toBe('');
  });

  it('spells 1 to 12 and falls back to numerals', () => {
    expect(numberWord(6, 'en')).toBe('six');
    expect(numberWord(6, 'tr')).toBe('altı');
    expect(numberWord(12, 'tr')).toBe('on iki');
    expect(numberWord(13, 'en')).toBe('13');
    expect(numberWord(0, 'en')).toBe('0');
    expect(numberWord(2.5, 'en')).toBe('2.5');
  });

  it('fills known tokens and leaves unknown ones', () => {
    expect(fill('a = {a}, b = {b}', { a: '1' })).toBe('a = 1, b = {b}');
    expect(fill('{x}{x}', { x: 'y' })).toBe('yy');
  });
});
