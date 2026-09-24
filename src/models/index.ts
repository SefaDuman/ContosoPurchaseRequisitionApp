/**
 * Clean app-facing domain models for Buy@Contoso.
 *
 * These are intentionally decoupled from the generated Dataverse virtual-entity
 * types (src/generated). The service layer (src/services) maps the verbose
 * `mserp_*` fields into these shapes so the UI never touches generated types.
 */

/** A node in the procurement category hierarchy tree. */
export interface Category {
  /** F&O CategoryName — unique within a hierarchy, used as the logical key. */
  name: string;
  /** Parent CategoryName, or null for a root category. */
  parentName: string | null;
  /** The procurement category hierarchy this category belongs to. */
  hierarchyName: string;
  /** Optional friendly description. */
  description?: string;
}

/** A category node with resolved children, used to render the tree. */
export interface CategoryNode extends Category {
  children: CategoryNode[];
}

/** A released product shown as a catalog card. */
export interface Product {
  /** F&O ProductNumber — the catalog key. */
  productNumber: string;
  /** F&O ItemNumber (may differ from product number for variants). */
  itemNumber: string;
  /** Display/search name. */
  name: string;
  /** Purchase unit symbol (e.g. "ea", "pcs"). */
  unit: string;
  /**
   * Indicative purchase price. The FINAL price is set by D365 trade agreements
   * when the purchase order is created — this value is for guidance only.
   */
  indicativePrice: number;
  /** Currency scope is the company; symbol resolved at display time. */
  company: string;
  /** Resolved image URL (via the pluggable image resolver). */
  imageUrl: string;
  /** Procurement category this product is assigned to, when known. */
  categoryName?: string;
}

/** A line item held in the cart before submission. */
export interface CartLine {
  /** Stable client id for list rendering. */
  id: string;
  /** The catalog product, or undefined for a non-catalog free-text request. */
  product?: Product;
  /** Free-text description (non-catalog) or product name (catalog). */
  description: string;
  /** Procurement category the line is booked against. */
  categoryName: string;
  quantity: number;
  /** Indicative unit price (0 for non-catalog until F&O prices it). */
  indicativePrice: number;
  unit: string;
  /** True when this is a free-text, non-catalog request. */
  isNonCatalog: boolean;
  /** Selected product dimensions (only when the product has them). */
  color?: string;
  size?: string;
  configuration?: string;
  style?: string;
}

/** Available product dimensions for a product master (empty arrays when none). */
export interface ProductDimensions {
  colors: string[];
  sizes: string[];
  configurations: string[];
  styles: string[];
}

/** Extended released-product data shown in the product detail modal. */
export interface ProductDetails {
  productNumber: string;
  itemNumber: string;
  name: string;
  purchasePrice: number;
  purchaseUnit?: string;
  companyCode?: string;
  vendor?: string;
  buyerGroup?: string;
  coverageGroup?: string;
  itemGroup?: string;
  itemModelGroup?: string;
  productType?: string;
  productDimensionGroup?: string;
  storageDimensionGroup?: string;
  trackingDimensionGroup?: string;
}

/** A worker who can be selected as requester/preparer. */
export interface Worker {
  personnelNumber: string;
  name: string;
  /** Primary contact email, when the F&O worker record has one. */
  email?: string;
}

/**
 * A directory person who can be @mentioned in a comment. Sourced from the
 * Office 365 Users connector (full Azure AD), not limited to F&O workers.
 */
export interface MentionUser {
  /** Stable mention id — the UPN/email when available, else the AAD object id. */
  id: string;
  /** Display name shown in the mention chip and picker. */
  displayName: string;
  /** SMTP address, when the directory record has one. */
  email?: string;
  /** Job title, shown as a secondary line in the picker. */
  jobTitle?: string;
}

/** A legal entity (company) the app can be scoped to. */
export interface LegalEntity {
  /** Company code / data area id, e.g. "USMF". */
  id: string;
  /** Display name of the legal entity. */
  name: string;
}

/** An inventory site (company-scoped). */
export interface Site {
  id: string;
}

/** A warehouse (scoped to a company + site). */
export interface Warehouse {
  id: string;
  siteId: string;
}

/** A receiving operating unit. */
export interface OperatingUnit {
  number: string;
  name: string;
}

/** Requisition purpose (maps to the Dataverse-remapped option set). */
export type RequisitionPurpose = 'Consumption' | 'Replenishment';

/** Requisition status (maps to the Dataverse-remapped option set). */
export type RequisitionStatus =
  | 'Draft'
  | 'InReview'
  | 'Rejected'
  | 'Approved'
  | 'Cancelled'
  | 'Closed'
  | 'BudgetReserved'
  | 'Unknown';

/** A single requisition line as shown in the app. */
export interface RequisitionLine {
  requisitionNumber: string;
  lineNumber: number;
  itemNumber?: string;
  description: string;
  categoryName?: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  lineAmount: number;
}

/** A purchase requisition header plus (optionally) its lines. */
export interface Requisition {
  requisitionNumber: string;
  name: string;
  purpose: RequisitionPurpose;
  status: RequisitionStatus;
  businessJustification?: string;
  requestedDate?: string;
  preparerPersonnelNumber?: string;
  preparerName?: string;
  total: number;
  lines: RequisitionLine[];
}

/** Input accepted by the service layer to create a requisition. */
export interface CreateRequisitionInput {
  name: string;
  purpose: RequisitionPurpose;
  businessJustification: string;
  requestedDate: string;
  /** Must resolve to a current F&O worker (see preparer gotcha). */
  preparerPersonnelNumber: string;
  /** Legal entity (company code) the requisition lines are bought for. */
  company: string;
  /** Receiving site id (optional). */
  site?: string;
  /** Receiving warehouse id (optional). */
  warehouse?: string;
  /** Receiving operating unit number (optional). */
  receivingOperatingUnit?: string;
  lines: CartLine[];
}

/** Approval decision verbs. */
export type ApprovalDecision = 'Approve' | 'Reject' | 'RequestChange';

/** Kind of collaboration entry on a requisition (maps to the sd_kind choice). */
export type RequisitionCommentKind = 'Comment' | 'Clarification' | 'BudgetNote' | 'System';

/**
 * A collaboration comment on a requisition, stored in the custom Dataverse
 * table `sd_requisitioncomment` and keyed to F&O by a plain requisition number
 * (virtual entities can't host Dataverse notes, hence a dedicated table).
 */
export interface RequisitionComment {
  /** sd_requisitioncommentid (Dataverse GUID). */
  id: string;
  /** F&O requisition number this comment belongs to. */
  requisitionNumber: string;
  /** Optional line number for line-level threads. */
  lineNumber?: number;
  /** Comment text. */
  body: string;
  /** Author's F&O personnel number, when resolved. */
  authorPersonnelNumber?: string;
  /** Author display name. */
  authorName?: string;
  /** Entry kind. */
  kind: RequisitionCommentKind;
  /** Parent comment id for threaded replies. */
  parentCommentId?: string;
  /** Dataverse createdon timestamp (ISO string). */
  createdOn?: string;
  /** True when a file is attached (sd_attachment). */
  hasAttachment: boolean;
  /** Attached file name, when present. */
  attachmentName?: string;
}

/** Input accepted by the collaboration service to add a comment. */
export interface AddCommentInput {
  requisitionNumber: string;
  body: string;
  kind?: RequisitionCommentKind;
  lineNumber?: number;
  parentCommentId?: string;
  authorPersonnelNumber?: string;
  authorName?: string;
}

/**
 * Purchase-order lifecycle stage as shown in the app. Derived from the F&O
 * `PurchaseOrderStatus` (receipt lifecycle) combined with the document approval
 * status, so a user can track an order from creation through to invoicing.
 */
export type PurchaseOrderStatus =
  | 'None'
  | 'OpenOrder'
  | 'Received'
  | 'Invoiced'
  | 'Canceled'
  | 'Unknown';

/** Approval/confirmation stage of a purchase order (document workflow state). */
export type PurchaseOrderApprovalStatus =
  | 'Draft'
  | 'InReview'
  | 'Rejected'
  | 'Approved'
  | 'InExternalReview'
  | 'Confirmed'
  | 'Finalized'
  | 'Unknown';

/** A single purchase-order line as shown in the app. */
export interface PurchaseOrderLine {
  purchaseOrderNumber: string;
  lineNumber: number;
  itemNumber?: string;
  description: string;
  categoryName?: string;
  /** Ordered quantity on the PO line. */
  quantity: number;
  unitPrice: number;
  unit?: string;
  lineAmount: number;
  /** Receipt lifecycle status of this line. */
  status: PurchaseOrderStatus;
  /** Confirmed receipt date, when the vendor has confirmed. */
  confirmedDeliveryDate?: string;
  /** The requisition number this line was created from, when known. */
  requisitionNumber?: string;
}

/** A purchase order connected to a requisition, plus (optionally) its lines. */
export interface PurchaseOrder {
  purchaseOrderNumber: string;
  /** Legal entity / data area the PO belongs to. */
  company: string;
  /** Vendor account number. */
  vendorAccount?: string;
  /** Vendor / PO name. */
  vendorName?: string;
  currencyCode?: string;
  /** Receipt lifecycle status. */
  status: PurchaseOrderStatus;
  /** Document approval/confirmation status. */
  approvalStatus: PurchaseOrderApprovalStatus;
  requestedDeliveryDate?: string;
  confirmedDeliveryDate?: string;
  /** Requester personnel number stamped on the PO, when present. */
  requesterPersonnelNumber?: string;
  /** Requisition number(s) this PO was generated from. */
  requisitionNumbers: string[];
  /** Sum of line amounts (best-effort). */
  total: number;
  lines: PurchaseOrderLine[];
}

/** Kind of goods-receipt confirmation (maps to the sd_kind choice). */
export type GoodsReceiptKind =
  | 'FullReceipt'
  | 'PartialReceipt'
  | 'MilestoneConfirmed'
  | 'Rejected';

/**
 * A requester's confirmation that a product/service on a purchase order was
 * received, stored in the custom Dataverse table `sd_goodsreceipt` together
 * with the receipt evidence file (F&O virtual entities can't host files).
 */
export interface GoodsReceipt {
  /** sd_goodsreceiptid (Dataverse GUID). */
  id: string;
  purchaseOrderNumber: string;
  /** Optional PO line number for line-level receipts. */
  purchaseOrderLine?: number;
  /** The requisition number this receipt traces back to, when known. */
  requisitionNumber?: string;
  company?: string;
  vendorAccount?: string;
  /** Quantity confirmed as received. */
  receivedQuantity?: number;
  /** Date the goods/service were received (ISO string). */
  receivedDate?: string;
  kind: GoodsReceiptKind;
  notes?: string;
  confirmedByPersonnelNumber?: string;
  confirmedByName?: string;
  /** Dataverse createdon timestamp (ISO string). */
  createdOn?: string;
  /** True when receipt evidence is attached. */
  hasEvidence: boolean;
  /** Evidence file name, when present. */
  evidenceName?: string;
}

/** Input accepted by the receipt service to confirm a receipt. */
export interface ConfirmReceiptInput {
  purchaseOrderNumber: string;
  purchaseOrderLine?: number;
  requisitionNumber?: string;
  company?: string;
  vendorAccount?: string;
  receivedQuantity?: number;
  /** Defaults to now when omitted. */
  receivedDate?: string;
  kind?: GoodsReceiptKind;
  notes?: string;
  confirmedByPersonnelNumber?: string;
  confirmedByName?: string;
}
