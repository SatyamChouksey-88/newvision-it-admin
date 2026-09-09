export interface ListQuery {
  _start?: string;
  _end?: string;
  _sort?: string;
  _order?: string;
  q?: string;
}

export interface ParsedList {
  skip: number;
  take: number;
  orderBy: Record<string, 'asc' | 'desc'> | undefined;
}

/**
 * Parse json-server / Refine simple-rest style list params into Prisma args.
 * Defaults: first 25 rows, ordered by id desc.
 */
export function parseListQuery(query: ListQuery, allowedSortFields?: string[]): ParsedList {
  const start = Number(query._start);
  const end = Number(query._end);
  const skip = Number.isFinite(start) && start >= 0 ? start : 0;
  const rawTake = Number.isFinite(end) ? end - skip : 25;
  const take = Math.min(Math.max(rawTake || 25, 1), 500);

  let orderBy: ParsedList['orderBy'];
  if (query._sort) {
    const field = query._sort;
    const order = (query._order || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
    if (!allowedSortFields || allowedSortFields.includes(field)) {
      orderBy = { [field]: order };
    }
  }
  if (!orderBy) {
    orderBy = { id: 'desc' };
  }

  return { skip, take, orderBy };
}
