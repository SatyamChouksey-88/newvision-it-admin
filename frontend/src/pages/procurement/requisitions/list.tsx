import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Input } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Figure, PrimaryWithSub } from '../../../components/Cells';
import { CopyButton } from '../../../components/CopyButton';
import { DataGrid, type TableDensity } from '../../../components/DataGrid/DataGrid';
import { EmptyState } from '../../../components/EmptyState';
import { TablePagination } from '../../../components/TablePagination';
import { TableSkeleton } from '../../../components/TableSkeleton';
import { httpClient } from '../../../providers/axios';
import { ApprovalChain, type ApproverRow, PrStatusTag } from '../status';

interface PrRow {
  id: number;
  requisitionNumber: string;
  title: string;
  status: string;
  totalCost: number;
  category: string;
  vendor?: { legalName: string } | null;
  approvers: ApproverRow[];
}

export function RequisitionList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PrRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [density, setDensity] = useState<TableDensity>('Compact');

  useEffect(() => {
    setLoading(true);
    httpClient
      .get('/purchase-requisitions', {
        params: { _start: (page - 1) * 25, _end: page * 25, q: q || undefined },
      })
      .then(({ data }) => {
        setRows(data.data ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page, q]);

  return (
    <Card
      title="Purchase requisitions"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/procurement/requisitions/create')}
        >
          New requisition
        </Button>
      }
    >
      <div className="nv-filter-row">
        <Input.Search
          allowClear
          placeholder="Search requisitions…"
          aria-label="Search requisitions"
          onSearch={setQ}
        />
      </div>
      {loading ? (
        <TableSkeleton columns={5} />
      ) : rows.length === 0 ? (
        <EmptyState description="No requisitions yet." />
      ) : (
        <>
          <DataGrid<PrRow>
            tableKey="purchase-requisitions"
            dataSource={rows}
            rowKey="id"
            density={density}
            onDensityChange={setDensity}
            onRow={(r) => ({ onClick: () => navigate(`/procurement/requisitions/show/${r.id}`) })}
            columns={[
              {
                title: 'Requisition',
                dataIndex: 'requisitionNumber',
                defaultWidth: 280,
                render: (_, r) => (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <PrimaryWithSub primary={r.title} sub={r.requisitionNumber} />
                    <CopyButton value={r.requisitionNumber} label="requisition number" />
                  </div>
                ),
              },
              { title: 'Vendor', render: (_, r) => r.vendor?.legalName ?? '—' },
              {
                title: 'Total',
                dataIndex: 'totalCost',
                render: (v: number) => <Figure>₹{Number(v).toLocaleString('en-IN')}</Figure>,
              },
              {
                title: 'Approval',
                render: (_, r) => <ApprovalChain approvers={r.approvers ?? []} />,
              },
              {
                title: 'Status',
                dataIndex: 'status',
                render: (v: string) => <PrStatusTag status={v} />,
              },
            ]}
          />
          <TablePagination page={page} pageSize={25} total={total} onChange={setPage} />
        </>
      )}
    </Card>
  );
}
