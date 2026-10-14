/** The most rows the server sends for one request. */
const pageSize = 1000;

type Page<T> = PromiseLike<{
  readonly data: T[] | null;
  readonly error: { readonly message: string } | null;
}>;

/**
 * Every row of a query, however many: the server sends at most a thousand rows at a time, so
 * they are asked for a thousand at a time until fewer come back. `page` must sort the rows in
 * a fixed order, so no row is skipped or sent twice between pages.
 */
export async function allPages<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  let more = true;
  while (more) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error !== null) {
      throw new Error(error.message);
    }
    const got = data ?? [];
    rows.push(...got);
    more = got.length === pageSize;
    from += pageSize;
  }
  return rows;
}

/** Splits a long list of ids, so each request's address stays short. */
export function inGroups<T>(ids: readonly T[], size = 100): T[][] {
  const groups: T[][] = [];
  for (let start = 0; start < ids.length; start += size) {
    groups.push(ids.slice(start, start + size));
  }
  return groups;
}
