import { supabase } from '@/lib/supabase';

/**
 * Utility to bypass Supabase PostgREST default 1000 row limit
 * by fetching all pages iteratively using .range(start, end).
 */
export async function fetchAllSupabaseRows<T = unknown>(
  tableName: string,
  selectQuery: string = '*'
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  let allRows: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select(selectQuery)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error(`Error fetching paginated rows from ${tableName}:`, error);
      throw error;
    }

    if (data && data.length > 0) {
      allRows = allRows.concat(data as T[]);
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    } else {
      hasMore = false;
    }
  }

  return allRows;
}
