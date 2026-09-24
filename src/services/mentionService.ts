/**
 * Mention notifications — posts a Teams card when someone is @mentioned in a
 * requisition comment. SHOWCASE ONLY, mirroring the approval-card demo: a
 * fire-and-forget POST to a Teams Workflow (Power Automate) HTTP trigger URL
 * (`TEAMS_MENTION_WEBHOOK_URL`). When the URL is unset the call is a no-op, so
 * posting a comment is never blocked or affected.
 */

import type { ParsedMention } from '../lib/mentions';
import { toPlainMentionText } from '../lib/mentions';
import { TEAMS_MENTION_WEBHOOK_URL } from './config';

/** Play URL for Buy@Contoso, used by the card's "Open in app" action. */
const APP_PLAY_URL =
  'https://apps.powerapps.com/play/e/YOUR_ENVIRONMENT_ID/app/YOUR_APP_ID';

export interface MentionNotification {
  requisitionNumber: string;
  requisitionName: string;
  /** Name of the person who wrote the comment. */
  authorName: string;
  /** Raw comment body (may contain encoded `@[name](id)` tokens). */
  commentBody: string;
  /** People mentioned in the comment. */
  mentions: ParsedMention[];
}

/** Build the "you were mentioned" adaptive card for a comment. */
export function buildMentionCard(n: MentionNotification): unknown {
  const who = n.mentions.map((m) => m.displayName).join(', ');
  const reqLabel = `${n.requisitionNumber || '(pending number)'} · ${n.requisitionName}`;
  return {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      {
        type: 'ColumnSet',
        columns: [
          { type: 'Column', width: 'auto', items: [{ type: 'TextBlock', text: '💬', size: 'ExtraLarge' }] },
          {
            type: 'Column',
            width: 'stretch',
            items: [
              { type: 'TextBlock', text: 'You were mentioned', weight: 'Bolder', size: 'Large', wrap: true },
              { type: 'TextBlock', text: reqLabel, isSubtle: true, spacing: 'None', wrap: true },
            ],
          },
        ],
      },
      {
        type: 'TextBlock',
        text: 'Demo notification — for showcase only.',
        isSubtle: true,
        wrap: true,
        spacing: 'None',
      },
      {
        type: 'FactSet',
        facts: [
          { title: 'From', value: n.authorName || '—' },
          { title: 'Mentioned', value: who || '—' },
        ],
      },
      { type: 'TextBlock', text: 'Comment', weight: 'Bolder', wrap: true, spacing: 'Medium' },
      { type: 'TextBlock', text: toPlainMentionText(n.commentBody), wrap: true, spacing: 'None' },
    ],
    actions: [{ type: 'Action.OpenUrl', title: 'Open in app', url: APP_PLAY_URL }],
  };
}

/**
 * Post the mention notification card to Teams in the background. Never throws —
 * a failed or unconfigured webhook must not affect posting the comment.
 */
export async function sendMentionNotifications(n: MentionNotification): Promise<void> {
  const url = TEAMS_MENTION_WEBHOOK_URL;
  if (!url || n.mentions.length === 0) return; // Not configured / nobody mentioned.
  const payload = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: buildMentionCard(n),
      },
    ],
  };
  try {
    // Fire-and-forget to a Power Automate trigger that sends no CORS headers.
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Background demo notification — swallow any network/webhook error.
  }
}
