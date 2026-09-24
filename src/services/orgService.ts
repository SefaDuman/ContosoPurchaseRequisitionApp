/**
 * Organisation service — receiving site / warehouse / operating unit lookups.
 *
 * Mirrors the Canvas cart logic:
 *  - Sites are scoped to the selected legal entity (company code).
 *  - Warehouses are scoped to the company AND the selected site.
 *  - Operating units are company-agnostic.
 */

import {
  Mserp_inventoperationalsitev2entitiesService,
  Mserp_inventwarehouseentitiesService,
  Mserp_omoperatingunitentitiesService,
} from '../generated';
import type { Mserp_inventoperationalsitev2entities } from '../generated/models/Mserp_inventoperationalsitev2entitiesModel';
import type { Mserp_inventwarehouseentities } from '../generated/models/Mserp_inventwarehouseentitiesModel';
import type { Mserp_omoperatingunitentities } from '../generated/models/Mserp_omoperatingunitentitiesModel';
import type { OperatingUnit, Site, Warehouse } from '../models';
import { odataString } from './config';
import { guard } from './errors';
import { fetchAll } from './paging';

/** Sites available in the given company. */
export async function getSites(company: string): Promise<Site[]> {
  if (!company) return [];
  return guard('Load sites', async () => {
    const rows = await fetchAll<Mserp_inventoperationalsitev2entities>(
      'Load sites',
      (o) => Mserp_inventoperationalsitev2entitiesService.getAll(o),
      {
        select: ['mserp_siteid', 'mserp_dataareaid'],
        filter: `mserp_dataareaid eq '${odataString(company)}'`,
        orderBy: ['mserp_siteid'],
      },
    );
    return rows.filter((r) => r.mserp_siteid).map((r) => ({ id: r.mserp_siteid }));
  });
}

/** Warehouses in the given company and site. */
export async function getWarehouses(company: string, siteId: string): Promise<Warehouse[]> {
  if (!company || !siteId) return [];
  return guard('Load warehouses', async () => {
    const rows = await fetchAll<Mserp_inventwarehouseentities>(
      'Load warehouses',
      (o) => Mserp_inventwarehouseentitiesService.getAll(o),
      {
        select: ['mserp_warehouseid', 'mserp_operationalsiteid', 'mserp_dataareaid'],
        filter:
          `mserp_dataareaid eq '${odataString(company)}' and ` +
          `mserp_operationalsiteid eq '${odataString(siteId)}'`,
        orderBy: ['mserp_warehouseid'],
      },
    );
    return rows
      .filter((r) => r.mserp_warehouseid)
      .map((r) => ({ id: r.mserp_warehouseid, siteId: r.mserp_operationalsiteid }));
  });
}

/** All receiving operating units. */
export async function getOperatingUnits(): Promise<OperatingUnit[]> {
  return guard('Load operating units', async () => {
    const rows = await fetchAll<Mserp_omoperatingunitentities>(
      'Load operating units',
      (o) => Mserp_omoperatingunitentitiesService.getAll(o),
      {
        select: ['mserp_operatingunitnumber', 'mserp_name', 'mserp_addressdescription'],
        orderBy: ['mserp_operatingunitnumber'],
      },
    );
    return rows
      .filter((r) => r.mserp_operatingunitnumber)
      .map((r) => ({
        number: r.mserp_operatingunitnumber as string,
        name: r.mserp_name || r.mserp_addressdescription || (r.mserp_operatingunitnumber as string),
      }));
  });
}
