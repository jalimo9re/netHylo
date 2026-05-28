import { duplicateBlockAt, moveBlock, parseBlocks, serializeBlocks } from './block-builder.utils';

describe('BlockBuilderUtils', () => {
  it('serializa y parsea bloques manteniendo estructura compatible', () => {
    const raw = [
      { type: 'hero', props: { title: 'Hola', subtitle: 'Mundo' } },
      { type: 'button', props: { text: 'Comprar', url: '/checkout' } },
    ];

    const parsed = parseBlocks(raw);
    const serialized = serializeBlocks(parsed);

    expect(serialized).toEqual([
      { type: 'hero', props: jasmine.objectContaining({ title: 'Hola' }) },
      { type: 'button', props: jasmine.objectContaining({ text: 'Comprar', url: '/checkout' }) },
    ]);
  });

  it('reordena y duplica bloques de forma estable', () => {
    const parsed = parseBlocks([
      { type: 'hero', props: { title: 'A' } },
      { type: 'text', props: { content: 'B' } },
      { type: 'button', props: { text: 'C' } },
    ]);

    const moved = moveBlock(parsed, 0, 2);
    const duplicated = duplicateBlockAt(moved, 1);
    const serialized = serializeBlocks(duplicated);

    expect(serialized.map((block) => block.type)).toEqual(['text', 'button', 'button', 'hero']);
    expect(serialized[1].props).toEqual(jasmine.objectContaining({ text: 'C' }));
    expect(serialized[2].props).toEqual(jasmine.objectContaining({ text: 'C' }));
  });
});
