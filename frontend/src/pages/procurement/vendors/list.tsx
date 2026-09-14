import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Input, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { PrimaryWithSub } from '../../../components/Cells';
import { CopyButton } from '../../../components/CopyButton';
import { DataGrid, type TableDensity } from '../../../components/DataGrid/DataGrid';
import { DesktopOnlyBanner } from '../../../components/DesktopOnlyBanner';
import { EmptyState } from '../../../components/EmptyState';
import { TablePagination } from '../../../components/TablePagination';
import { TableSkeleton } from '../../../components/TableSkeleton';
import { NV_TABLE_STICKY } from '../../../chrome';
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
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [q, setQ] = useState('');
  const [density, setDensity] = useState<TableDensity>('Compact');

  useEffect(() => {
    void reload;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    httpClient
      .get('/vendors', { params: { _start: (page - 1) * 25, _end: page * 25, q: q || undefined } })
      .then(({ data }) => {
        if (cancelled) return;
        setRows(data.data ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, q, reload]);

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
      <DesktopOnlyBanner noun="Vendors" />
      <div className="nv-filter-row">
        <Input.Search
          allowClear
          placeholder="Search vendors…"
          aria-label="Search vendors"
          onSearch={setQ}
        />
      </div>
      {loading ? (
        <TableSkeleton columns={5} />
      ) : loadError ? (
        <EmptyState
          description="Could not load vendors. Check your connection and try again."
          actionLabel="Retry"
          onAction={() => setReload((n) => n + 1)}
        />
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
            sticky={NV_TABLE_STICKY}
            enableQueueKeys
            onOpenRow={(r) => navigate(`/procurement/vendors/show/${r.id}`)}
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
