import { Pagination, Select, Space, Typography } from 'antd';

export function TablePagination({
  total,
  page,
  pageSize,
  onChange,
}: {
  total: number;
  page: number;
  pageSize: number;
  onChange: (page: number, pageSize: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 12 }} wrap>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Showing {start}–{end} of {total}
      </Typography.Text>
      <Space>
        <Select
          size="small"
          aria-label="Rows per page"
          value={pageSize}
          onChange={(size) => onChange(1, size)}
          options={[10, 25, 50, 100].map((n) => ({ label: `${n} / page`, value: n }))}
          style={{ width: 110 }}
        />
        <Pagination
          size="small"
          current={page}
          pageSize={pageSize}
          total={total}
          showSizeChanger={false}
          onChange={(p, size) => onChange(p, size)}
        />
      </Space>
    </Space>
  );
}
