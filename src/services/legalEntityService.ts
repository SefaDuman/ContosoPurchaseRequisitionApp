/**
 * Legal-entity service — lists the companies the app can be scoped to.
 *
 * The company code (`mserp_legalentityid`, e.g. "USMF") is the data area id used
 * to scope products and to stamp `mserp_buyinglegalentityid` on requisition lines.
 */

import { Mserp_omlegalentitiesService } from '../generated';
import type { Mserp_omlegalentities } from '../generated/models/Mserp_omlegalentitiesModel';
import type { LegalEntity } from '../models';
import { guard } from './errors';
import { fetchAll } from './paging';

function mapLegalEntity(e: Mserp_omlegalentities): LegalEntity {
  const id = e.mserp_legalentityid ?? '';
  return {
    id,
    name: e.mserp_name || e.mserp_companyname || id,
  };
}

/** List all legal entities (companies), ordered by company code. */
export async function getLegalEntities(): Promise<LegalEntity[]> {
  return guard('Load legal entities', async () => {
    const rows = await fetchAll<Mserp_omlegalentities>(
      'Load legal entities',
      (o) => Mserp_omlegalentitiesService.getAll(o),
      {
        select: ['mserp_legalentityid', 'mserp_name', 'mserp_companyname'],
        orderBy: ['mserp_legalentityid'],
      },
    );
    return rows.filter((e) => e.mserp_legalentityid).map(mapLegalEntity);
  });
}
