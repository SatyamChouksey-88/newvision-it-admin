import type { TableProps } from 'antd';

/** Extract pagination state from Refine useTable tableProps and wire custom footer. */
export function useRefinePagination<T>(tableProps: TableProps<T>) {
  const pagination = tableProps.pagination;
  const page =
    pagination && typeof pagination !== 'boolean' ? pagination.current ?? 1 : 1;
  const pageSize =
    pagination && typeof pagination !== 'boolean' ? pagination.pageSize ?? 25 : 25;
  const total =
    pagination && typeof pagination !== 'boolean' ? pagination.total ?? 0 : 0;

  const onPageChange = (p: number, size: number) => {
    tableProps.onChange?.(
      { current: p, pageSize: size },
      {},
      {},
      { action: 'paginate', currentDataSource: [...(tableProps.dataSource ?? [])] as T[] },
    );
  };

  return { page, pageSize, total, onPageChange };
}
