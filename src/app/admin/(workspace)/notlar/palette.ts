import type { PairedBlock } from '@/lib/note-blocks';

export type BlockType = PairedBlock['type'];

/** The block types the note body offers, in palette order. Pull quote stays available; the editor warns about it. */
export const blockPalette: readonly { type: BlockType; label: string }[] = [
  { type: 'p', label: 'Paragraf' },
  { type: 'h2', label: 'Başlık 2' },
  { type: 'h3', label: 'Başlık 3' },
  { type: 'h4', label: 'Alt başlık' },
  { type: 'ul', label: 'Madde listesi' },
  { type: 'ol', label: 'Numaralı liste' },
  { type: 'quote', label: 'Alıntı' },
  { type: 'pullquote', label: 'Pull quote' },
  { type: 'code', label: 'Kod' },
  { type: 'math', label: 'Denklem' },
  { type: 'image', label: 'Görsel' },
  { type: 'figure', label: 'Teknik figür (kayıtlı)' },
  { type: 'table', label: 'Tablo' },
  { type: 'callout', label: 'Not kutusu' },
];

export const blockLabel = (type: BlockType): string => blockPalette.find((b) => b.type === type)?.label ?? type;

const pair = () => ({ tr: '', en: '' });

export function blankBlock(type: BlockType): PairedBlock {
  switch (type) {
    case 'p':
      return { type, text: pair() };
    case 'h2':
    case 'h3':
      return { type, id: '', text: pair() };
    case 'h4':
      return { type, text: pair() };
    case 'ul':
    case 'ol':
      return { type, items: [pair()] };
    case 'quote':
    case 'pullquote':
      return { type, text: pair(), cite: pair() };
    case 'code':
      return { type, code: '', lang: 'text', filename: pair() };
    case 'math':
      return { type, tex: '' };
    case 'image':
      return { type, src: '', width: 0, height: 0, alt: pair(), caption: pair() };
    case 'figure':
      return { type, figureId: '', alt: pair(), caption: pair() };
    case 'table':
      return {
        type,
        align: ['l', 'l'],
        caption: pair(),
        head: [pair(), pair()],
        rows: [[pair(), pair()]],
        note: pair(),
      };
    case 'callout':
      return { type, kind: 'note', title: pair(), paragraphs: [pair()] };
  }
}
