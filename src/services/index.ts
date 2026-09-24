/**
 * Public service-layer API for Buy@Contoso.
 *
 * The UI imports only from here — everything below is built on the generated
 * Dataverse virtual-entity models/services and maps to clean app models.
 */

export {
  getCategoryTree,
  getProductsByCategory,
  searchProducts,
  getProductImage,
  getProductDimensions,
  getProductDetails,
} from './catalogService';

export {
  createRequisition,
  getMyRequisitions,
  getPendingApprovals,
  decideApproval,
  inferUserCompany,
} from './requisitionService';

export { getWorkers, resolveWorker, getCurrentUserEmail, resolveWorkerByEmail, getCurrentWorker, getCurrentEmployee, getCurrentUserInfo, getCurrentUserPhoto, searchDirectoryUsers } from './workerService';
export type { CurrentUser } from './workerService';

export { getLegalEntities } from './legalEntityService';

export { getComments, addComment, uploadCommentAttachment, downloadCommentAttachment } from './collaborationService';

export {
  getPurchaseOrdersForRequisition,
  getMyPurchaseOrders,
} from './purchaseOrderService';

export {
  getReceiptsForOrder,
  getReceiptsForOrders,
  confirmReceipt,
  uploadReceiptEvidence,
  downloadReceiptEvidence,
} from './receiptService';

export { openRequisitionTeamsChat, buildRequisitionChatLink } from './teamsService';

export { sendRequisitionApprovalCard, buildApprovalCard } from './approvalService';
export type { ApprovalCardRequisition, ApprovalCardLine } from './approvalService';

export { sendMentionNotifications, buildMentionCard } from './mentionService';
export type { MentionNotification } from './mentionService';

export { getSites, getWarehouses, getOperatingUnits } from './orgService';

export {
  setImageResolver,
  useCdnImageResolver,
  useImageMap,
  resolveImage,
  placeholderImageResolver,
} from './imageResolver';
export type { ImageResolver } from './imageResolver';

export { AppError, toMessage } from './errors';
export {
  DEFAULT_COMPANY,
  DEFAULT_PREPARER_PERSONNEL_NUMBER,
  STATUS_LABEL,
  PO_STATUS_LABEL,
  PO_STATUS_TONE,
  PO_APPROVAL_LABEL,
} from './config';
