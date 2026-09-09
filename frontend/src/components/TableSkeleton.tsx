import { Skeleton, Table } from 'antd';

export function TableSkeleton({ columns = 6, rows = 8 }: { columns?: number; rows?: number }) {
  return (
    <Table
      pagination={false}
      dataSource={Array.from({ length: rows }, (_, i) => ({ key: i }))}
      columns={Array.from({ length: columns }, (_, i) => ({
        title: <Skeleton.Input active size="small" style={{ width: 80 }} />,
        render: () => <Skeleton.Input active size="small" style={{ width: '100%' }} />,
        key: i,
      }))}
      size="small"
    />
  );
}
