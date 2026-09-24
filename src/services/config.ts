/**
 * Cross-cutting service configuration for Buy@Contoso.
 *
 * Centralises company scoping and the Dataverse option-set value maps so the
 * enum <-> app-model translation lives in exactly one place.
 */

import type {
  PurchaseOrderApprovalStatus,
  PurchaseOrderStatus,
  RequisitionPurpose,
  RequisitionStatus,
} from '../models';

/**
 * Demo legal entity. Every catalog read is scoped to this company and every
 * requisition line is stamped with it (the virtual entity requires a
 * buying legal entity on the line — the header exposes no company field).
 */
export const DEFAULT_COMPANY = 'USMF';

/**
 * Fallback preparer for the demo. Creating a purchase requisition FAILS in F&O
 * if the preparer is not a current worker ("Preparer must be current worker"),
 * so we default to a known-good worker (000001 Jodi Christiansen in USMF).
 */
export const DEFAULT_PREPARER_PERSONNEL_NUMBER = '000001';

/** Max records to pull when paging through a virtual entity (safety cap). */
export const MAX_RECORDS = 5000;

/**
 * Teams Workflow (Power Automate) HTTP URL used to post the demo approval
 * adaptive card when a requisition is submitted. Empty = disabled (no-op).
 *
 * Set it via a `VITE_TEAMS_APPROVAL_WEBHOOK_URL` build env var, or paste the URL
 * directly here. Create the URL with the Teams "Post to a chat when a webhook
 * request is received" workflow so the card is delivered to you for the demo.
 */
export const TEAMS_APPROVAL_WEBHOOK_URL: string =
  ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[
    'VITE_TEAMS_APPROVAL_WEBHOOK_URL'
  ] ?? '').trim();

/**
 * Teams Workflow (Power Automate) HTTP URL used to post a notification card
 * when someone is @mentioned in a requisition comment. Empty = disabled (no-op).
 *
 * Set it via a `VITE_TEAMS_MENTION_WEBHOOK_URL` build env var. When unset it
 * falls back to the approval webhook, so a single configured workflow can
 * deliver both card types for the demo.
 */
export const TEAMS_MENTION_WEBHOOK_URL: string =
  (((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[
    'VITE_TEAMS_MENTION_WEBHOOK_URL'
  ] ?? '').trim() || TEAMS_APPROVAL_WEBHOOK_URL);

/** Page size used when paging through the virtual entities. */
export const PAGE_SIZE = 200;

/**
 * Dataverse-remapped option-set values for RequisitionPurpose. These are NOT
 * the raw F&O base-enum values (Consumption=0 / Replenishment=1) — the virtual
 * entity surfaces them as option-set integers.
 */
export const PURPOSE_CODE = {
  Consumption: 200000000,
  Replenishment: 200000001,
} as const satisfies Record<RequisitionPurpose, number>;

export const PURPOSE_FROM_CODE: Record<number, RequisitionPurpose> = {
  200000000: 'Consumption',
  200000001: 'Replenishment',
};

/**
 * Dataverse-remapped option-set values for RequisitionStatus. Again these are
 * option-set integers, not the F&O base enum (Draft=0 / InReview=10 / Approved=30).
 */
export const STATUS_CODE = {
  Draft: 200000000,
  InReview: 200000001,
  Rejected: 200000002,
  Approved: 200000003,
  Cancelled: 200000004,
  Closed: 200000005,
  BudgetReserved: 200000006,
} as const satisfies Record<Exclude<RequisitionStatus, 'Unknown'>, number>;

export const STATUS_FROM_CODE: Record<number, RequisitionStatus> = {
  200000000: 'Draft',
  200000001: 'InReview',
  200000002: 'Rejected',
  200000003: 'Approved',
  200000004: 'Cancelled',
  200000005: 'Closed',
  200000006: 'BudgetReserved',
};

/** Human-friendly labels for statuses. */
export const STATUS_LABEL: Record<RequisitionStatus, string> = {
  Draft: 'Draft',
  InReview: 'In review',
  Rejected: 'Rejected',
  Approved: 'Approved',
  Cancelled: 'Cancelled',
  Closed: 'Closed',
  BudgetReserved: 'Budget reserved',
  Unknown: 'Unknown',
};

/** Escape single quotes for safe embedding in an OData string literal. */
export function odataString(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Purchase-order receipt lifecycle labels/tones. The F&O `PurchaseOrderStatus`
 * enum is surfaced on the virtual entity with Dataverse-remapped option-set
 * values; the service maps those to the app statuses below.
 */
export const PO_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  None: 'Ordered',
  OpenOrder: 'Partially received',
  Received: 'Received',
  Invoiced: 'Invoiced',
  Canceled: 'Canceled',
  Unknown: 'Unknown',
};

export const PO_STATUS_TONE: Record<PurchaseOrderStatus, string> = {
  None: 'info',
  OpenOrder: 'warning',
  Received: 'success',
  Invoiced: 'success',
  Canceled: 'neutral',
  Unknown: 'neutral',
};

export const PO_APPROVAL_LABEL: Record<PurchaseOrderApprovalStatus, string> = {
  Draft: 'Draft',
  InReview: 'In review',
  Rejected: 'Rejected',
  Approved: 'Approved',
  InExternalReview: 'In external review',
  Confirmed: 'Confirmed',
  Finalized: 'Finalized',
  Unknown: 'Unknown',
};
