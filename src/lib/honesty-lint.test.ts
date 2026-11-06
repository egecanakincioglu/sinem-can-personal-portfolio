import { describe, expect, it } from 'vitest';
import { fold } from './fold';
import { lintText } from './honesty-lint';

const rules = (t: string) => lintText(t).map((h) => h.rule);

describe('lintText', () => {
  it('passes plain factual text', () => {
    expect(lintText('Bir aylık staj yaptım ve tornalama uyguladım.')).toEqual([]);
  });

  it('flags self-praise words in both languages, Turkish-folded', () => {
    expect(lintText('UZMANLIK alanım')[0]).toEqual({ match: 'UZMANLIK', rule: 'Öz değerlendirme sözcüğü' });
    expect(lintText('Tutkulu bir öğrenci')).toHaveLength(1);
    expect(lintText('A passionate and results-oriented student')).toHaveLength(2);
    expect(lintText('İleri düzey deneyimli')).toHaveLength(1);
  });

  it('does not match inside other words', () => {
    expect(lintText('kolaylıkla')).toEqual([]);
  });

  it('flags language levels', () => {
    expect(rules('İngilizce B2')).toEqual(['Dil düzeyi (CEFR)']);
    expect(rules('Seviye b2 değil')).toEqual(['Dil düzeyi (CEFR)']);
    expect(rules('B20 parçası')).toEqual([]);
  });

  it('flags a percentage only near a skill word', () => {
    expect(rules('Yetkinlik düzeyi %80')).toContain('Beceri için yüzde');
    expect(rules('Skill level 90%')).toContain('Beceri için yüzde');
    expect(rules('Parça %80 daha hafif')).not.toContain('Beceri için yüzde');
  });

  it('flags yaptım next to an observed process and gözlemledim next to an applied one', () => {
    expect(rules('Dövme yaptım')).toEqual(['Yaptım, gözlemlenen süreçle yan yana']);
    expect(rules('Tornalama gözlemledim')).toEqual(['Gözlemledim, uygulanan süreçle yan yana']);
    expect(rules('Döküm gözlemledim')).toEqual([]);
  });

  it('flags hareket var near bileşke', () => {
    expect(rules('Hareket var, bileşke sıfır değil')).toEqual(['Hareket var, bileşkeyle yan yana']);
    expect(rules('Hareket var')).toEqual([]);
  });
});

describe('fold', () => {
  it('lowercases and folds Turkish letters', () => {
    expect(fold('İŞÇİ Öğüt Ğ ı')).toBe('isci ogut g i');
  });
});
