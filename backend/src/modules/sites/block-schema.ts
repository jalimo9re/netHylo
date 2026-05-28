import { BadRequestException } from '@nestjs/common';

export const ALLOWED_BLOCK_TYPES = ['hero', 'text', 'image', 'form', 'button'] as const;
export type AllowedBlockType = (typeof ALLOWED_BLOCK_TYPES)[number];

export type SiteBlock = {
  type: AllowedBlockType;
  props: Record<string, string>;
};

export const BLOCK_LIMITS = {
  maxBlocksPerPayload: 100,
  maxCharsPerProp: 3000,
  maxCharsPerPayload: 120_000,
} as const;

const PROP_RULES: Record<AllowedBlockType, string[]> = {
  hero: ['title', 'subtitle', 'ctaText', 'ctaUrl'],
  text: ['content'],
  image: ['url', 'alt', 'caption'],
  form: ['title', 'description', 'buttonText'],
  button: ['text', 'url', 'variant'],
};

function sanitizeString(value: unknown, max = 5000): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

export function sanitizeBlocks(rawBlocks: unknown): SiteBlock[] {
  if (!Array.isArray(rawBlocks)) {
    throw new BadRequestException('blocks must be an array');
  }
  if (rawBlocks.length > BLOCK_LIMITS.maxBlocksPerPayload) {
    throw new BadRequestException(`blocks exceeds max items (${BLOCK_LIMITS.maxBlocksPerPayload})`);
  }

  let totalChars = 0;
  const sanitized = rawBlocks.map((raw, index) => {
    if (!raw || typeof raw !== 'object') {
      throw new BadRequestException(`block at index ${index} must be an object`);
    }

    const source = raw as { type?: unknown; props?: unknown };
    if (!source.type || !ALLOWED_BLOCK_TYPES.includes(source.type as AllowedBlockType)) {
      throw new BadRequestException(`block at index ${index} has an invalid type`);
    }

    const type = source.type as AllowedBlockType;
    const allowedProps = PROP_RULES[type];
    const sourceProps =
      source.props && typeof source.props === 'object' && !Array.isArray(source.props)
        ? (source.props as Record<string, unknown>)
        : {};

    const props: Record<string, string> = {};
    for (const key of allowedProps) {
      const value = sanitizeString(sourceProps[key], BLOCK_LIMITS.maxCharsPerProp);
      if (value) props[key] = value;
      totalChars += value.length;
      if (totalChars > BLOCK_LIMITS.maxCharsPerPayload) {
        throw new BadRequestException(`blocks payload exceeds ${BLOCK_LIMITS.maxCharsPerPayload} chars`);
      }
    }

    return { type, props };
  });

  return sanitized;
}
