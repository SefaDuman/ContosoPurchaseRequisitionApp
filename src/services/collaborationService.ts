/**
 * Collaboration service — comments, clarifications, and attachments on a
 * requisition. Backed by the custom Dataverse table `sd_requisitioncomment`
 * (keyed to F&O by a plain requisition number), since F&O virtual entities
 * cannot host Dataverse notes/annotations.
 */

import { Sd_requisitioncommentsService } from '../generated';
import {
  Sd_requisitioncommentssd_kind,
  type Sd_requisitioncomments,
  type Sd_requisitioncommentsBase,
} from '../generated/models/Sd_requisitioncommentsModel';
import type { AddCommentInput, RequisitionComment, RequisitionCommentKind } from '../models';
import { odataString } from './config';
import { guard, unwrap } from './errors';
import { fetchAll } from './paging';
import { getClient } from '@microsoft/power-apps/data';
import { dataSourcesInfo } from '../../.power/schemas/appschemas/dataSourcesInfo';

/** Dataverse data source name for the comments table. */
const DATA_SOURCE = 'sd_requisitioncomments';

/** Direct client for file operations the generated service doesn't expose. */
const client = getClient(dataSourcesInfo);

const COMMENT_SELECT = [
  'sd_requisitioncommentid',
  'sd_requisitionnumber',
  'sd_linenumber',
  'sd_body',
  'sd_authorpersonnelnumber',
  'sd_authorname',
  'sd_kind',
  'sd_parentcommentid',
  'sd_attachment_name',
  'createdon',
];

/** sd_kind choice values (must match the option set created in Dataverse). */
const KIND_CODE: Record<RequisitionCommentKind, number> = {
  Comment: 100000000,
  Clarification: 100000001,
  BudgetNote: 100000002,
  System: 100000003,
};

function mapComment(r: Sd_requisitioncomments): RequisitionComment {
  const kind = (r.sd_kind != null
    ? Sd_requisitioncommentssd_kind[r.sd_kind]
    : 'Comment') as RequisitionCommentKind;
  return {
    id: r.sd_requisitioncommentid,
    requisitionNumber: r.sd_requisitionnumber,
    lineNumber: r.sd_linenumber ?? undefined,
    body: r.sd_body ?? '',
    authorPersonnelNumber: r.sd_authorpersonnelnumber ?? undefined,
    authorName: r.sd_authorname ?? undefined,
    kind,
    parentCommentId: r.sd_parentcommentid ?? undefined,
    createdOn: r.createdon ?? undefined,
    attachmentName: r.sd_attachment_name ?? undefined,
    hasAttachment: !!r.sd_attachment_name,
  };
}

/** Load every comment for a requisition, oldest first. */
export async function getComments(requisitionNumber: string): Promise<RequisitionComment[]> {
  return guard('Load comments', async () => {
    if (!requisitionNumber) return [];
    const rows = await fetchAll<Sd_requisitioncomments>(
      'Load comments',
      (o) => Sd_requisitioncommentsService.getAll(o),
      {
        select: COMMENT_SELECT,
        filter: `sd_requisitionnumber eq '${odataString(requisitionNumber)}' and statecode eq 0`,
        orderBy: ['createdon asc'],
      },
    );
    return rows.map(mapComment);
  });
}

/** Add a comment and return the created record. */
export async function addComment(input: AddCommentInput): Promise<RequisitionComment> {
  return guard('Add comment', async () => {
    const kind = input.kind ?? 'Comment';
    // owner/statecode are set server-side; the generated type marks them
    // required, so we build the payload and cast.
    const record = {
      sd_name: `${input.requisitionNumber} · ${kind}`,
      sd_requisitionnumber: input.requisitionNumber,
      sd_body: input.body,
      sd_kind: KIND_CODE[kind],
      ...(input.lineNumber != null ? { sd_linenumber: input.lineNumber } : {}),
      ...(input.parentCommentId ? { sd_parentcommentid: input.parentCommentId } : {}),
      ...(input.authorPersonnelNumber
        ? { sd_authorpersonnelnumber: input.authorPersonnelNumber }
        : {}),
      ...(input.authorName ? { sd_authorname: input.authorName } : {}),
    } as Omit<Sd_requisitioncommentsBase, 'sd_requisitioncommentid'>;

    const created = unwrap(await Sd_requisitioncommentsService.create(record), 'Add comment');
    return mapComment(created);
  });
}

/** Attach a file to an existing comment (sd_attachment file column). */
export async function uploadCommentAttachment(commentId: string, file: File): Promise<void> {
  return guard('Upload attachment', async () => {
    unwrap(
      await Sd_requisitioncommentsService.upload(commentId, 'sd_attachment', file, file.name),
      'Upload attachment',
    );
  });
}

/** Download a comment's attachment (sd_attachment file column) as bytes. */
export async function downloadCommentAttachment(commentId: string): Promise<Uint8Array> {
  return guard('Download attachment', async () => {
    return unwrap(
      await client.downloadFileFromRecord(DATA_SOURCE, commentId, 'sd_attachment'),
      'Download attachment',
    );
  });
}
