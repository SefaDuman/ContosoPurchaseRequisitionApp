/**
 * Demo Teams approval — posts an approval-style adaptive card to Microsoft Teams
 * when a requisition is submitted. This is a SHOWCASE ONLY: it does not drive any
 * real approval workflow. The Approve/Reject buttons flip client-side card state
 * (Action.ToggleVisibility) so the demo is self-contained with no bot/backend.
 *
 * Delivery is a fire-and-forget POST to a Teams Workflow (Power Automate) HTTP
 * trigger URL configured in `TEAMS_APPROVAL_WEBHOOK_URL`. When the URL is unset
 * the call is a no-op, so submission is never blocked or affected.
 */

import { formatMoney } from '../lib/format';
import { TEAMS_APPROVAL_WEBHOOK_URL } from './config';

/** Play URL for Buy@Contoso, used by the card's "Open in app" action. */
const APP_PLAY_URL =
  'https://apps.powerapps.com/play/e/YOUR_ENVIRONMENT_ID/app/YOUR_APP_ID';

/** Max requisition lines to list on the card before summarising the rest. */
const MAX_CARD_LINES = 8;

export interface ApprovalCardLine {
  description: string;
  quantity: number;
  unit?: string;
  lineTotal: number;
}

export interface ApprovalCardRequisition {
  requisitionNumber: string;
  name: string;
  purpose: string;
  company: string;
  requestedDate: string;
  businessJustification: string;
  requesterName: string;
  total: number;
  lines: ApprovalCardLine[];
}

function buildLineBlocks(req: ApprovalCardRequisition): unknown[] {
  const shown = req.lines.slice(0, MAX_CARD_LINES);
  const blocks: Record<string, unknown>[] = shown.map((l) => ({
    type: 'ColumnSet',
    spacing: 'Small',
    columns: [
      {
        type: 'Column',
        width: 'stretch',
        items: [{ type: 'TextBlock', text: `${l.quantity} × ${l.description}`, wrap: true }],
      },
      {
        type: 'Column',
        width: 'auto',
        items: [{ type: 'TextBlock', text: formatMoney(l.lineTotal), horizontalAlignment: 'Right' }],
      },
    ],
  }));
  const remaining = req.lines.length - shown.length;
  if (remaining > 0) {
    blocks.push({
      type: 'ColumnSet',
      spacing: 'Small',
      columns: [
        {
          type: 'Column',
          width: 'stretch',
          items: [{ type: 'TextBlock', text: `+ ${remaining} more line(s)`, isSubtle: true, wrap: true }],
        },
        { type: 'Column', width: 'auto', items: [{ type: 'TextBlock', text: ' ' }] },
      ],
    });
  }
  return blocks;
}

/** Build the approval adaptive card for a requisition. */
export function buildApprovalCard(req: ApprovalCardRequisition): unknown {
  return {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      {
        type: 'ColumnSet',
        columns: [
          { type: 'Column', width: 'auto', items: [{ type: 'TextBlock', text: '🧾', size: 'ExtraLarge' }] },
          {
            type: 'Column',
            width: 'stretch',
            items: [
              { type: 'TextBlock', text: 'Purchase requisition approval', weight: 'Bolder', size: 'Large', wrap: true },
              {
                type: 'TextBlock',
                text: `${req.requisitionNumber || '(pending number)'} · ${req.name}`,
                isSubtle: true,
                spacing: 'None',
                wrap: true,
              },
            ],
          },
        ],
      },
      {
        type: 'TextBlock',
        text: 'Demo approval — for showcase only. No real workflow is triggered.',
        isSubtle: true,
        wrap: true,
        spacing: 'None',
      },
      {
        type: 'FactSet',
        facts: [
          { title: 'Requester', value: req.requesterName || '—' },
          { title: 'Company', value: req.company || '—' },
          { title: 'Purpose', value: req.purpose || '—' },
          { title: 'Requested date', value: req.requestedDate || '—' },
          { title: 'Total', value: formatMoney(req.total) },
        ],
      },
      ...(req.businessJustification
        ? [
            { type: 'TextBlock', text: 'Justification', weight: 'Bolder', wrap: true, spacing: 'Medium' },
            { type: 'TextBlock', text: req.businessJustification, wrap: true, spacing: 'None' },
          ]
        : []),
      { type: 'TextBlock', text: 'Lines', weight: 'Bolder', wrap: true, spacing: 'Medium' },
      ...buildLineBlocks(req),
      {
        type: 'Container',
        id: 'approvedMsg',
        isVisible: false,
        style: 'good',
        spacing: 'Medium',
        items: [{ type: 'TextBlock', text: '✅ Approved (demo)', weight: 'Bolder', wrap: true }],
      },
      {
        type: 'Container',
        id: 'rejectedMsg',
        isVisible: false,
        style: 'attention',
        spacing: 'Medium',
        items: [{ type: 'TextBlock', text: '❌ Rejected (demo)', weight: 'Bolder', wrap: true }],
      },
    ],
    actions: [
      {
        type: 'Action.ToggleVisibility',
        title: 'Approve',
        style: 'positive',
        targetElements: ['approvedMsg', { elementId: 'rejectedMsg', isVisible: false }],
      },
      {
        type: 'Action.ToggleVisibility',
        title: 'Reject',
        style: 'destructive',
        targetElements: ['rejectedMsg', { elementId: 'approvedMsg', isVisible: false }],
      },
      { type: 'Action.OpenUrl', title: 'Open in app', url: APP_PLAY_URL },
    ],
  };
}

/**
 * Post the demo approval card to Teams in the background. Never throws — a
 * failed or unconfigured webhook must not affect requisition submission.
 */
export async function sendRequisitionApprovalCard(req: ApprovalCardRequisition): Promise<void> {
  const url = TEAMS_APPROVAL_WEBHOOK_URL;
  if (!url) return; // Not configured — silently skip.
  const payload = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: buildApprovalCard(req),
      },
    ],
  };
  try {
    // Fire-and-forget to a Power Automate trigger that sends no CORS headers.
    // `no-cors` lets the POST reach the flow (opaque response we don't need);
    // a safelisted content-type avoids a preflight the endpoint would reject.
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
