/**
 * Worker service — resolves F&O workers used as requester/preparer.
 *
 * This directly supports the "Preparer must be current worker" F&O constraint:
 * callers can validate a personnel number before submitting a requisition.
 */

import { getContext } from '@microsoft/power-apps/app';
import {
  Mserp_dirpersonuserentitiesService,
  Mserp_hcmemployeev2entitiesService,
  Mserp_hcmworkerentitiesService,
  Office365UsersService,
} from '../generated';
import type { Mserp_dirpersonuserentities } from '../generated/models/Mserp_dirpersonuserentitiesModel';
import type { Mserp_hcmemployeev2entities } from '../generated/models/Mserp_hcmemployeev2entitiesModel';
import type { Mserp_hcmworkerentities } from '../generated/models/Mserp_hcmworkerentitiesModel';
import type { Worker, MentionUser } from '../models';
import { guard } from './errors';
import { fetchAll } from './paging';
import { odataString } from './config';

/** Columns selected for every worker query. */
const WORKER_SELECT = ['mserp_personnelnumber', 'mserp_name', 'mserp_primarycontactemail'];

function mapWorker(w: Mserp_hcmworkerentities): Worker {
  return {
    personnelNumber: w.mserp_personnelnumber ?? '',
    name: w.mserp_name ?? w.mserp_personnelnumber ?? '',
    email: w.mserp_primarycontactemail ?? undefined,
  };
}

/** List workers (optionally filtered by a name/number search term). */
export async function getWorkers(term?: string): Promise<Worker[]> {
  return guard('Load workers', async () => {
    const options = term?.trim()
      ? {
          filter: `contains(mserp_name,'${odataString(term.trim())}') or contains(mserp_personnelnumber,'${odataString(
            term.trim(),
          )}')`,
        }
      : {};
    const rows = await fetchAll(
      'Load workers',
      (o) => Mserp_hcmworkerentitiesService.getAll(o),
      { select: WORKER_SELECT, orderBy: ['mserp_name'], ...options },
    );
    return rows.filter((w) => w.mserp_personnelnumber).map(mapWorker);
  });
}

/**
 * Resolve a single worker by personnel number. Returns undefined when the
 * worker is not a current F&O worker, letting the caller block submit.
 */
export async function resolveWorker(personnelNumber: string): Promise<Worker | undefined> {
  return guard('Resolve worker', async () => {
    const rows = await fetchAll(
      'Resolve worker',
      (o) => Mserp_hcmworkerentitiesService.getAll(o),
      {
        top: 1,
        select: WORKER_SELECT,
        filter: `mserp_personnelnumber eq '${odataString(personnelNumber)}'`,
      },
    );
    return rows.length ? mapWorker(rows[0]) : undefined;
  });
}

/**
 * The signed-in user's email (UPN), read from the Power Apps host context.
 *
 * Guarded: `getContext()` is only available when the app runs inside the
 * Power Apps host (`pac code run` / published). Returns undefined otherwise so
 * callers can fall back to a default requester.
 */
export async function getCurrentUserEmail(): Promise<string | undefined> {
  try {
    const context = await getContext();
    return context.user.userPrincipalName?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/** Identity of the signed-in Power Apps user (for the header user chip). */
export interface CurrentUser {
  email?: string;
  fullName?: string;
  objectId?: string;
}

/** Read the signed-in user's identity from the Power Apps host context. */
export async function getCurrentUserInfo(): Promise<CurrentUser> {
  try {
    const context = await getContext();
    return {
      email: context.user.userPrincipalName?.trim() || undefined,
      fullName: context.user.fullName?.trim() || undefined,
      objectId: context.user.objectId,
    };
  } catch {
    return {};
  }
}

/**
 * Search the Azure AD directory (Office 365 Users connector) for people who
 * can be @mentioned in a comment. Returns a small, clean list ordered by the
 * connector's relevance. Never throws — an unconfigured/unavailable connector
 * yields an empty list so the composer degrades gracefully.
 */
export async function searchDirectoryUsers(term: string, top = 8): Promise<MentionUser[]> {
  const search = term.trim();
  if (!search) return [];
  try {
    const result = await Office365UsersService.SearchUser(search, top);
    if (!result.success || !result.data) return [];
    return result.data
      .map((u) => ({
        id: u.UserPrincipalName?.trim() || u.Mail?.trim() || u.Id,
        displayName: u.DisplayName?.trim() || u.UserPrincipalName?.trim() || u.Mail?.trim() || 'Unknown',
        email: u.Mail?.trim() || u.UserPrincipalName?.trim() || undefined,
        jobTitle: u.JobTitle?.trim() || undefined,
      }))
      .filter((u) => !!u.id);
  } catch {
    return [];
  }
}

/**
 * The signed-in user's photo as a data URI, via the Office 365 Users connector
 * (`UserPhoto_V2`). This is the code-app equivalent of Power Fx `User().Image`.
 * Returns undefined when the user has no photo or the connector is unavailable.
 */
export async function getCurrentUserPhoto(): Promise<string | undefined> {
  try {
    const info = await getCurrentUserInfo();
    const id = info.objectId || info.email;
    if (!id) return undefined;
    const result = await Office365UsersService.UserPhoto_V2(id);
    if (!result.success || !result.data) return undefined;
    const data = result.data;
    return data.startsWith('data:') ? data : `data:image/jpeg;base64,${data}`;
  } catch {
    return undefined;
  }
}

/**
 * Resolve the F&O worker whose primary contact email matches `email`.
 * Returns undefined when no current worker has that email.
 */
export async function resolveWorkerByEmail(email: string): Promise<Worker | undefined> {
  const address = email.trim();
  if (!address) return undefined;
  return guard('Resolve worker by email', async () => {
    const rows = await fetchAll(
      'Resolve worker by email',
      (o) => Mserp_hcmworkerentitiesService.getAll(o),
      {
        top: 1,
        select: WORKER_SELECT,
        filter: `mserp_primarycontactemail eq '${odataString(address)}'`,
      },
    );
    return rows.length ? mapWorker(rows[0]) : undefined;
  });
}

/**
 * Resolve the worker for the currently signed-in user by matching their email
 * (UPN) to a worker's primary contact email. Returns undefined when the user
 * isn't a current worker or the host context is unavailable.
 */
export async function getCurrentWorker(): Promise<Worker | undefined> {
  const email = await getCurrentUserEmail();
  if (!email) return undefined;
  return resolveWorkerByEmail(email);
}

/**
 * Resolve the current employee via the party-number chain:
 *   signed-in email → DirPersonUser.PartyNumber → HcmEmployeeV2 (by party number).
 * The employee's personnel number is used as the requester. Returns undefined
 * when any step fails to match (or the host context is unavailable).
 */
export async function getCurrentEmployee(): Promise<Worker | undefined> {
  const email = await getCurrentUserEmail();
  if (!email) return undefined;
  return guard('Resolve current employee', async () => {
    // 1) email → party number (DirPersonUser).
    const persons = await fetchAll<Mserp_dirpersonuserentities>(
      'Resolve person by email',
      (o) => Mserp_dirpersonuserentitiesService.getAll(o),
      {
        top: 1,
        select: [
          'mserp_partynumber',
          'mserp_personname',
          'mserp_useremail',
          'mserp_personprimaryemail',
        ],
        filter: `mserp_useremail eq '${odataString(email)}' or mserp_personprimaryemail eq '${odataString(
          email,
        )}'`,
      },
    );
    const party = persons[0]?.mserp_partynumber;
    if (!party) return undefined;

    // 2) party number → employee (HcmEmployeeV2).
    const employees = await fetchAll<Mserp_hcmemployeev2entities>(
      'Resolve employee by party number',
      (o) => Mserp_hcmemployeev2entitiesService.getAll(o),
      {
        top: 1,
        select: [
          'mserp_personnelnumber',
          'mserp_name',
          'mserp_partynumber',
          'mserp_primarycontactemail',
        ],
        filter: `mserp_partynumber eq '${odataString(party)}'`,
      },
    );
    const emp = employees[0];
    if (!emp?.mserp_personnelnumber) return undefined;
    return {
      personnelNumber: emp.mserp_personnelnumber,
      name: emp.mserp_name || persons[0]?.mserp_personname || emp.mserp_personnelnumber,
      email: emp.mserp_primarycontactemail ?? email,
    };
  });
}
