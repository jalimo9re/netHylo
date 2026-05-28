export const BLOCK_TYPES = ['hero', 'text', 'image', 'form', 'button'] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

const EDITABLE_PROPS: Record<BlockType, string[]> = {
  hero: ['title', 'subtitle', 'ctaText', 'ctaUrl'],
  text: ['content'],
  image: ['url', 'alt', 'caption'],
  form: ['title', 'description', 'buttonText'],
  button: ['text', 'url', 'variant'],
};

export type BuilderBlock = {
  id: string;
  type: BlockType;
  props: Record<string, string>;
};

export type BuilderHistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

const HISTORY_LIMIT = 30;

function createBlockId(type: BlockType): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${type}`;
}

export function createDefaultProps(type: BlockType): Record<string, string> {
  switch (type) {
    case 'hero':
      return { title: 'Nuevo hero', subtitle: '', ctaText: 'Continuar', ctaUrl: '' };
    case 'text':
      return { content: 'Texto del bloque' };
    case 'image':
      return { url: 'https://picsum.photos/1200/500', alt: '', caption: '' };
    case 'form':
      return { title: 'Formulario', description: '', buttonText: 'Enviar' };
    case 'button':
      return { text: 'Boton', url: '', variant: 'primary' };
    default:
      return {};
  }
}

export function createBlock(type: BlockType): BuilderBlock {
  return {
    id: createBlockId(type),
    type,
    props: createDefaultProps(type),
  };
}

export function duplicateBlock(block: BuilderBlock): BuilderBlock {
  return {
    ...block,
    id: createBlockId(block.type),
    props: { ...block.props },
  };
}

export function getEditablePropKeys(type: BlockType): string[] {
  return [...EDITABLE_PROPS[type]];
}

export function moveBlock(blocks: BuilderBlock[], fromIndex: number, toIndex: number): BuilderBlock[] {
  if (!blocks.length) return [];
  if (fromIndex < 0 || fromIndex >= blocks.length) return [...blocks];
  const safeToIndex = Math.max(0, Math.min(toIndex, blocks.length - 1));
  if (fromIndex === safeToIndex) return [...blocks];
  const next = [...blocks];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(safeToIndex, 0, moved);
  return next;
}

export function duplicateBlockAt(blocks: BuilderBlock[], index: number): BuilderBlock[] {
  const source = blocks[index];
  if (!source) return [...blocks];
  const clone = duplicateBlock(source);
  const next = [...blocks];
  next.splice(index + 1, 0, clone);
  return next;
}

export function updateBlockProps(
  blocks: BuilderBlock[],
  index: number,
  patch: Record<string, string>,
): BuilderBlock[] {
  const current = blocks[index];
  if (!current) return [...blocks];
  const next = [...blocks];
  next[index] = { ...current, props: { ...current.props, ...patch } };
  return next;
}

export function removeBlockAt(blocks: BuilderBlock[], index: number): BuilderBlock[] {
  if (index < 0 || index >= blocks.length) return [...blocks];
  const next = [...blocks];
  next.splice(index, 1);
  return next;
}

export function serializeBlocks(blocks: BuilderBlock[]): Array<{ type: BlockType; props: Record<string, string> }> {
  return blocks.map((block) => ({
    type: block.type,
    props: { ...block.props },
  }));
}

export function parseBlocks(rawBlocks: unknown[] | undefined | null): BuilderBlock[] {
  if (!Array.isArray(rawBlocks)) return [];

  return rawBlocks
    .filter((raw) => !!raw && typeof raw === 'object' && !Array.isArray(raw))
    .map((raw, index) => {
      const source = raw as { type?: string; props?: unknown };
      const safeType = BLOCK_TYPES.includes(source.type as BlockType)
        ? (source.type as BlockType)
        : 'text';
      const sourceProps =
        source.props && typeof source.props === 'object' && !Array.isArray(source.props)
          ? (source.props as Record<string, unknown>)
          : {};
      const props: Record<string, string> = {};
      for (const [key, value] of Object.entries(sourceProps)) {
        if (typeof value === 'string') props[key] = value;
      }
      return {
        id: `block-${index}-${safeType}`,
        type: safeType,
        props: { ...createDefaultProps(safeType), ...props },
      };
    });
}

export function initHistory<T>(initial: T): BuilderHistoryState<T> {
  return { past: [], present: initial, future: [] };
}

export function pushHistory<T>(history: BuilderHistoryState<T>, next: T): BuilderHistoryState<T> {
  if (Object.is(next, history.present)) return history;
  const past = [...history.past, history.present];
  return {
    past: past.slice(Math.max(0, past.length - HISTORY_LIMIT)),
    present: next,
    future: [],
  };
}

export function undoHistory<T>(history: BuilderHistoryState<T>): BuilderHistoryState<T> {
  if (!history.past.length) return history;
  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoHistory<T>(history: BuilderHistoryState<T>): BuilderHistoryState<T> {
  if (!history.future.length) return history;
  const [next, ...rest] = history.future;
  return {
    past: [...history.past, history.present],
    present: next,
    future: rest,
  };
}
