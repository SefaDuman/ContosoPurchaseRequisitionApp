/**
 * Teams collaboration — spin up a Microsoft Teams group chat scoped to a
 * requisition via a deep link (https://teams.microsoft.com/l/chat/...).
 *
 * This complements the in-app Dataverse comment thread: the deep link needs no
 * extra auth or backend, opens in the Teams client/web, names the chat after
 * the requisition and pre-fills a starter message. Participants (the requester)
 * are resolved best-effort so the chat opens as a named group.
 */

import { formatMoney } from '../lib/format';
import type { Requisition } from '../models';
import { STATUS_LABEL } from './config';

/** Play URL for Buy@Contoso, shared in the chat so recipients can open the app. */
const APP_PLAY_URL =
  'https://apps.powerapps.com/play/e/YOUR_ENVIRONMENT_ID/app/YOUR_APP_ID';

/** Teams caps the chat topic; keep it comfortably under the limit. */
const MAX_TOPIC = 100;

/** Demo participants — the chat is always opened as a group with these two. */
const DEMO_PARTICIPANTS = [
  'someone@contoso.com',
  'admin@contoso.com',
];

function chatTopic(req: Requisition): string {
  const label = `PR ${req.requisitionNumber || 'draft'} — ${req.name}`.trim();
  return label.length > MAX_TOPIC ? `${label.slice(0, MAX_TOPIC - 1)}…` : label;
}

function starterMessage(req: Requisition): string {
  return [
    `Let's discuss purchase requisition ${req.requisitionNumber || '(pending number)'} — ${req.name}.`,
    `Status: ${STATUS_LABEL[req.status]} · Total: ${formatMoney(req.total)}`,
    req.preparerName ? `Requester: ${req.preparerName}` : undefined,
    `Open in Buy@Contoso: ${APP_PLAY_URL}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Build the Teams deep link that opens a chat about a requisition. Passing one
 * or more participant emails makes it a named group chat; with none, Teams
 * opens a new chat with the topic/message pre-filled for the user to address.
 */
export function buildRequisitionChatLink(req: Requisition, participantEmails: string[] = []): string {
  const parts = [
    participantEmails.length
      ? `users=${participantEmails.map((e) => encodeURIComponent(e)).join(',')}`
      : undefined,
    `topicName=${encodeURIComponent(chatTopic(req))}`,
    `message=${encodeURIComponent(starterMessage(req))}`,
  ].filter(Boolean);
  return `https://teams.microsoft.com/l/chat/0/0?${parts.join('&')}`;
}

/**
 * Open a Teams group chat about a requisition with the demo participants.
 * The starter message carries the requisition summary; press send in Teams.
 */
export async function openRequisitionTeamsChat(
  req: Requisition,
  extraEmails: string[] = [],
): Promise<void> {
  const emails = new Set([...DEMO_PARTICIPANTS, ...extraEmails.map((e) => e.trim())].filter(Boolean));
  const url = buildRequisitionChatLink(req, Array.from(emails));
  window.open(url, '_blank', 'noopener,noreferrer');
}
