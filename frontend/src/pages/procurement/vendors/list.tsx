import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Input, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { PrimaryWithSub } from '../../../components/Cells';
import { CopyButton } from '../../../components/CopyButton';
import { DataGrid, type TableDensity } from '../../../components/DataGrid/DataGrid';
import { EmptyState } from '../../../components/EmptyState';
import { TablePagination } from '../../../components/TablePagination';
import { TableSkeleton } from '../../../components/TableSkeleton';
import { httpClient } from '../../../providers/axios';
import { VendorStatusTag } from '../status';

export interface VendorRow {
  id: number;
  vendorCode: string;
  legalName: string;
  tradingName?: string | null;
  status: string;
  isPreferred?: boolean;
  ratingSummary?: number | null;
  categories?: string[];
  bankAccountNumber?: string | null;
  country?: string;
}

export function VendorList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<VendorRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [density, setDensity] = useState<TableDensity>('Compact');

  useEffect(() => {
    setLoading(true);
    httpClient
      .get('/vendors', { params: { _start: (page - 1) * 25, _end: page * 25, q: q || undefined } })
      .then(({ data }) => {
        setRows(data.data ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page, q]);

  return (
    <Card
      title="Vendors"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/procurement/vendors/create')}
        >
          New vendor
        </Button>
      }
    >
      <div className="nv-list-search-row">
        <Input.Search
          allowClear
          placeholder="Search vendors…"
          aria-label="Search vendors"
          onSearch={setQ}
        />
      </div>
      {loading ? (
        <TableSkeleton columns={5} />
      ) : rows.length === 0 ? (
        <EmptyState description="No vendors yet." />
      ) : (
        <>
          <DataGrid<VendorRow>
            tableKey="vendors"
            dataSource={rows}
            rowKey="id"
            density={density}
            onDensityChange={setDensity}
            onRow={(r) => ({ onClick: () => navigate(`/procurement/vendors/show/${r.id}`) })}
            columns={[
              {
                title: 'Vendor',
                dataIndex: 'legalName',
                defaultWidth: 260,
                render: (_, r) => (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <PrimaryWithSub
                      primary={
                        <span>
                          {r.legalName} {r.isPreferred ? <Tag color="blue">Preferred</Tag> : null}
                        </span>
                      }
                      sub={r.vendorCode}
                    />
                    <CopyButton value={r.vendorCode} label="vendor code" />
                  </div>
                ),
              },
              {
                title: 'Categories',
                dataIndex: 'categories',
                render: (v: string[]) => (v?.length ? v.join(', ') : '—'),
              },
              { title: 'Bank', dataIndex: 'bankAccountNumber', render: (v: string) => v || '—' },
              {
                title: 'Score',
                dataIndex: 'ratingSummary',
                render: (v: number | null) => (v != null ? Number(v).toFixed(1) : '—'),
              },
              {
                title: 'Status',
                dataIndex: 'status',
                render: (v: string) => <VendorStatusTag status={v} />,
              },
            ]}
          />
          <TablePagination page={page} pageSize={25} total={total} onChange={setPage} />
        </>
      )}
    </Card>
  );
}
