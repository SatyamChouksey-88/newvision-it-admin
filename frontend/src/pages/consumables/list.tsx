import { PlusOutlined, UserAddOutlined, WarningOutlined } from '@ant-design/icons';
import { useGetIdentity } from '@refinedev/core';
import { Button, Card, Form, Input, InputNumber, Modal, Space, Tag, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { CopyButton } from '../../components/CopyButton';
import { PrimaryWithSub } from '../../components/Cells';
import { DataGrid, type TableDensity } from '../../components/DataGrid/DataGrid';
import { EmployeeSelect } from '../../components/EmployeeSelect';
import { EmptyState } from '../../components/EmptyState';
import { TablePagination } from '../../components/TablePagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useToast } from '../../components/Toast';
import type { Identity } from '../../providers/authProvider';
import { httpClient } from '../../providers/axios';
import { tabularNums } from '../../theme';
import type { Consumable } from '../../types';

const IT_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'IT_SUPPORT'];

export function ConsumablesPage() {
  const toast = useToast();
  const { data: identity } = useGetIdentity<Identity>();
  const canManage = ['SUPER_ADMIN', 'IT_ADMIN'].includes(identity?.role ?? '');
  const canIssue = IT_ROLES.includes(identity?.role ?? '');
  const [rows, setRows] = useState<Consumable[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [density, setDensity] = useState<TableDensity>('Compact');
  const [createOpen, setCreateOpen] = useState(false);
  const [issueTarget, setIssueTarget] = useState<Consumable | null>(null);
  const [employeeId, setEmployeeId] = useState<number>();
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await httpClient.get('/consumables', {
        params: { _start: (page - 1) * pageSize, _end: page * pageSize },
      });
      setRows(data.data ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (values: {
    name: string;
    category: string;
    quantityTotal: number;
    lowStockThreshold?: number;
  }) => {
    await httpClient.post('/consumables', values);
    toast.success(`Added ${values.name}`);
    setCreateOpen(false);
    form.resetFields();
    void load();
  };

  const issue = async () => {
    if (!issueTarget || !employeeId) return;
    await httpClient.post(`/consumables/${issueTarget.id}/issue`, { employeeId });
    toast.success(`Issued ${issueTarget.name}`);
    setIssueTarget(null);
    setEmployeeId(undefined);
    void load();
  };

  return (
    <Card
      title="Consumables"
      extra={
        canManage ? (
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Add consumable
          </Button>
        ) : null
      }
    >
      {loading ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          description="No consumables tracked yet"
          actionLabel={canManage ? 'Add consumable' : undefined}
          onAction={canManage ? () => setCreateOpen(true) : undefined}
        />
      ) : (
        <>
          <DataGrid<Consumable>
            tableKey="consumables"
            searchInputId="consumables-grid-search"
            rowKey="id"
            dataSource={rows}
            loading={loading}
            density={density}
            onDensityChange={setDensity}
            fixFirstColumn
            expandable={{
              expandedRowKeys: expanded,
              onExpandedRowsChange: (keys) => setExpanded(keys as number[]),
              expandedRowRender: (r) => (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Recent issues:{' '}
                  {(r.issues ?? [])
                    .slice(0, 5)
                    .map(
                      (i) =>
                        `${i.quantity}× → ${i.employee?.firstName} ${i.employee?.lastName}`,
                    )
                    .join(' · ') || 'None yet'}
                </Typography.Text>
              ),
            }}
            columns={[
              {
                title: 'ID',
                dataIndex: 'id',
                defaultWidth: 72,
                render: (v: number) => (
                  <Space size={4}>
                    {v}
                    <CopyButton value={String(v)} label="consumable id" />
                  </Space>
                ),
              },
              {
                title: 'Item',
                gridKey: 'item',
                render: (_, r) => (
                  <Space>
                    <PrimaryWithSub primary={r.name} sub={r.category} />
                    <CopyButton value={r.name} label="item name" />
                    {r.quantityAvailable <= r.lowStockThreshold ? (
                      <Tag icon={<WarningOutlined />} color="error">
                        Low stock
                      </Tag>
                    ) : null}
                  </Space>
                ),
              },
              {
                title: 'Available',
                dataIndex: 'quantityAvailable',
                align: 'right',
                sorter: (a, b) => a.quantityAvailable - b.quantityAvailable,
                render: (v) => <span style={tabularNums}>{v}</span>,
              },
              {
                title: 'Total',
                dataIndex: 'quantityTotal',
                align: 'right',
                sorter: (a, b) => a.quantityTotal - b.quantityTotal,
                render: (v) => <span style={tabularNums}>{v}</span>,
              },
              {
                title: 'Threshold',
                dataIndex: 'lowStockThreshold',
                align: 'right',
                render: (v) => <span style={tabularNums}>{v}</span>,
              },
              {
                title: 'Actions',
                gridKey: 'actions',
                exportable: false,
                render: (_, r) =>
                  canIssue && r.quantityAvailable > 0 ? (
                    <Button
                      size="small"
                      icon={<UserAddOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIssueTarget(r);
                      }}
                    >
                      Issue
                    </Button>
                  ) : null,
              },
            ]}
          />
          <TablePagination total={total} page={page} pageSize={pageSize} onChange={(p, s) => { setPage(p); setPageSize(s); }} />
        </>
      )}

      <Modal open={createOpen} title="Add consumable" onCancel={() => setCreateOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={create} initialValues={{ lowStockThreshold: 5 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="quantityTotal" label="Starting quantity" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="lowStockThreshold" label="Low-stock threshold">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!issueTarget}
        title={`Issue ${issueTarget?.name}`}
        onCancel={() => setIssueTarget(null)}
        onOk={() => void issue()}
      >
        <EmployeeSelect value={employeeId} onChange={setEmployeeId} />
      </Modal>
    </Card>
  );
}
