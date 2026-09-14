import { Card, Input } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Figure, PrimaryWithSub } from '../../../components/Cells';
import { CopyButton } from '../../../components/CopyButton';
import { DataGrid, type TableDensity } from '../../../components/DataGrid/DataGrid';
import { DesktopOnlyBanner } from '../../../components/DesktopOnlyBanner';
import { EmptyState } from '../../../components/EmptyState';
import { TablePagination } from '../../../components/TablePagination';
import { TableSkeleton } from '../../../components/TableSkeleton';
import { NV_TABLE_STICKY } from '../../../chrome';
import { httpClient } from '../../../providers/axios';
import { PoStatusTag } from '../status';

interface PoRow {
  id: number;
  poNumber: string;
  status: string;
  total: number;
  revision: number;
  vendor?: { legalName: string };
}

export function PurchaseOrderList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [density, setDensity] = useState<TableDensity>('Compact');

  useEffect(() => {
    void reload;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    httpClient
      .get('/purchase-orders', {
        params: { _start: (page - 1) * 25, _end: page * 25, q: q || undefined },
      })
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
    <Card title="Purchase orders">
      <DesktopOnlyBanner noun="Purchase orders" />
      <div className="nv-filter-row">
        <Input.Search
          allowClear
          placeholder="Search POs…"
          aria-label="Search purchase orders"
          onSearch={setQ}
        />
      </div>
      {loading ? (
        <TableSkeleton columns={4} />
      ) : loadError ? (
        <EmptyState
          description="Could not load purchase orders. Check your connection and try again."
          actionLabel="Retry"
          onAction={() => setReload((n) => n + 1)}
        />
      ) : rows.length === 0 ? (
        <EmptyState description="No purchase orders yet. Convert an approved requisition." />
      ) : (
        <>
          <DataGrid<PoRow>
            tableKey="purchase-orders"
            dataSource={rows}
            rowKey="id"
            density={density}
            onDensityChange={setDensity}
            sticky={NV_TABLE_STICKY}
            enableQueueKeys
            onOpenRow={(r) => navigate(`/procurement/orders/show/${r.id}`)}
            onRow={(r) => ({ onClick: () => navigate(`/procurement/orders/show/${r.id}`) })}
            columns={[
              {
                title: 'PO',
                dataIndex: 'poNumber',
                render: (_, r) => (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <PrimaryWithSub primary={r.poNumber} sub={`rev ${r.revision}`} />
                    <CopyButton value={r.poNumber} label="PO number" />
                  </div>
                ),
              },
              { title: 'Vendor', render: (_, r) => r.vendor?.legalName ?? '—' },
              {
                title: 'Total',
                dataIndex: 'total',
                render: (v: number) => <Figure>₹{Number(v).toLocaleString('en-IN')}</Figure>,
              },
              {
                title: 'Status',
                dataIndex: 'status',
                render: (v: string) => <PoStatusTag status={v} />,
              },
            ]}
          />
          <TablePagination page={page} pageSize={25} total={total} onChange={setPage} />
        </>
      )}
    </Card>
  );
}
