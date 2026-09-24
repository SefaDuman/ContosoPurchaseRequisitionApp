/**
 * @mention helpers for the collaboration timeline.
 *
 * Mentions are encoded inline in the free-text comment body as
 * `@[Display Name](id)`, where `id` is the person's UPN/email (or AAD object
 * id). This keeps mentions machine-readable without a dedicated Dataverse
 * column, so they can be highlighted on render and later notified.
 */

import type { ReactNode } from 'react';
import type { MentionUser } from '../models';

/** Matches a single encoded mention token: `@[Display Name](id)`. */
const MENTION_TOKEN = /@\[([^\]]+)\]\(([^)]+)\)/g;

/** Build the inline token stored in the comment body for a picked person. */
export function encodeMention(user: MentionUser): string {
  const name = user.displayName.replace(/[[\]]/g, ' ').trim();
  const id = user.id.replace(/[()]/g, '').trim();
  return `@[${name}](${id})`;
}

/** Extract the unique mention ids referenced in a comment body. */
export function extractMentionIds(text: string): string[] {
  const ids = new Set<string>();
  for (const match of text.matchAll(MENTION_TOKEN)) {
    const id = match[2]?.trim();
    if (id) ids.add(id);
  }
  return [...ids];
}

/** A mention parsed out of a comment body. */
export interface ParsedMention {
  id: string;
  displayName: string;
}

/** Extract the unique mentions (id + display name) referenced in a body. */
export function extractMentions(text: string): ParsedMention[] {
  const byId = new Map<string, string>();
  for (const match of text.matchAll(MENTION_TOKEN)) {
    const id = match[2]?.trim();
    if (!id || byId.has(id)) continue;
    byId.set(id, match[1]?.trim() || id);
  }
  return [...byId].map(([id, displayName]) => ({ id, displayName }));
}

/** Replace encoded mention tokens with plain `@Name` text (for notifications). */
export function toPlainMentionText(text: string): string {
  return text.replace(MENTION_TOKEN, (_all, name: string) => `@${name.trim()}`);
}

/**
 * Render a comment body as React nodes, replacing encoded mention tokens with
 * highlighted chips and leaving all other text intact.
 */
export function renderWithMentions(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  for (const match of text.matchAll(MENTION_TOKEN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }
    const name = match[1]?.trim() || match[2]?.trim() || 'user';
    nodes.push(
      <span key={`m-${key++}`} className="mention" title={match[2]?.trim()}>
        @{name}
      </span>,
    );
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

/** An active `@query` being typed, with the index of its `@` trigger. */
export interface ActiveMention {
  query: string;
  start: number;
}

/**
 * Detect an in-progress mention immediately before the caret. Returns the
 * partial query (text after `@`) and the `@` position, or null when the caret
 * is not inside a mention. The `@` must start the text or follow whitespace,
 * and the query may not span whitespace-then-nothing / newlines / another `@`.
 */
export function getActiveMention(text: string, caret: number): ActiveMention | null {
  const upToCaret = text.slice(0, caret);
  const at = upToCaret.lastIndexOf('@');
  if (at < 0) return null;
  const before = at === 0 ? '' : upToCaret[at - 1];
  if (before && !/\s/.test(before)) return null;
  const query = upToCaret.slice(at + 1);
  // Stop matching once the query contains a newline or another '@'.
  if (/[\n@]/.test(query)) return null;
  // Keep the picker snappy and avoid matching long non-name runs.
  if (query.length > 40) return null;
  return { query, start: at };
}

/** Result of inserting a chosen mention into the composer text. */
export interface MentionInsertion {
  text: string;
  caret: number;
}

/**
 * Replace the active `@query` (from `start` to `caret`) with the encoded
 * mention token plus a trailing space, returning the new text and caret.
 */
export function insertMention(
  text: string,
  active: ActiveMention,
  caret: number,
  user: MentionUser,
): MentionInsertion {
  const token = `${encodeMention(user)} `;
  const next = text.slice(0, active.start) + token + text.slice(caret);
  return { text: next, caret: active.start + token.length };
}
