/**
 * Paging helper for the generated virtual-entity services.
 *
 * Dataverse caps page sizes, so large result sets come back across multiple
 * pages via a skipToken. This walks every page (up to a safety cap) and
 * returns the flattened records.
 */

import type { IOperationResult } from '@microsoft/power-apps/data';
import type { IGetAllOptions } from '../generated/models/CommonModels';
import { MAX_RECORDS, PAGE_SIZE } from './config';
import { unwrap } from './errors';

type GetAllFn<T> = (options?: IGetAllOptions) => Promise<IOperationResult<T[]>>;

/**
 * Retrieve all records matching `options`, following skipTokens until the data
 * is exhausted or MAX_RECORDS is reached.
 */
export async function fetchAll<T>(
  context: string,
  getAll: GetAllFn<T>,
  options: IGetAllOptions = {},
): Promise<T[]> {
  const collected: T[] = [];
  let skipToken: string | undefined = options.skipToken;

  do {
    const result: IOperationResult<T[]> = await getAll({
      maxPageSize: PAGE_SIZE,
      ...options,
      skipToken,
    });
    const page = unwrap(result, context);
    collected.push(...page);
    skipToken = result.skipToken;

    // Respect an explicit `top`: stop once we have enough.
    if (options.top && collected.length >= options.top) {
      return collected.slice(0, options.top);
    }
  } while (skipToken && collected.length < MAX_RECORDS);

  return collected;
}
