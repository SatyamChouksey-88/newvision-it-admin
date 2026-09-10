import { PlusOutlined, UserAddOutlined, WarningOutlined } from '@ant-design/icons';
import { useGetIdentity } from '@refinedev/core';
import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { PrimaryWithSub } from '../../components/Cells';
import { CopyButton } from '../../components/CopyButton';
import { DataGrid, type TableDensity } from '../../components/DataGrid/DataGrid';
import { EmployeeSelect } from '../../components/EmployeeSelect';
import { EmptyState } from '../../components/EmptyState';
import { RecordNotes } from '../../components/RecordNotes';
import { TablePagination } from '../../components/TablePagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useToast } from '../../components/Toast';
import type { Identity } from '../../providers/authProvider';
import { apiErrorMessage, httpClient } from '../../providers/axios';
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

  const [lowOnly, setLowOnly] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issueQty, setIssueQty] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await httpClient.get('/consumables', {
        params: {
          _start: (page - 1) * pageSize,
          _end: page * pageSize,
          ...(lowOnly ? { lowStock: 'true' } : {}),
        },
      });
      setRows(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, lowOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (values: {
    name: string;
    category: string;
    quantityTotal: number;
    lowStockThreshold?: number;
  }) => {
    setBusy(true);
    try {
      await httpClient.post('/consumables', values);
      toast.success(`Added ${values.name}`);
      setCreateOpen(false);
      form.resetFields();
      void load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not add the consumable'));
    } finally {
      setBusy(false);
    }
  };

  const issue = async () => {
    if (!issueTarget || !employeeId) {
      toast.warning('Pick an employee');
      return;
    }
    setBusy(true);
    try {
      await httpClient.post(`/consumables/${issueTarget.id}/issue`, {
        employeeId,
        quantity: issueQty,
      });
      toast.success(`Issued ${issueQty}× ${issueTarget.name}`);
      setIssueTarget(null);
      setEmployeeId(undefined);
      setIssueQty(1);
      void load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Issue failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title={
        <Space size="middle" wrap>
          <Typography.Text strong>Consumables</Typography.Text>
          <Checkbox
            checked={lowOnly}
            onChange={(e) => {
              setLowOnly(e.target.checked);
              setPage(1);
            }}
          >
            Low stock only
          </Checkbox>
        </Space>
      }
      extra={
        canManage ? (
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            Add consumable
          </Button>
        ) : null
      }
    >
      {loading && rows.length === 0 ? (
        <TableSkeleton />
      ) : loadError ? (
        <EmptyState
          description="Could not load consumables. Check your connection and try again."
          actionLabel="Retry"
          onAction={() => void load()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          description={
            lowOnly ? 'Nothing is below its low-stock threshold' : 'No consumables tracked yet'
          }
          actionLabel={lowOnly ? 'Show all' : canManage ? 'Add consumable' : undefined}
          onAction={
            lowOnly ? () => setLowOnly(false) : canManage ? () => setCreateOpen(true) : undefined
          }
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
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Recent issues:{' '}
                    {(r.issues ?? [])
                      .slice(0, 5)
                      .map((i) => `${i.quantity}× → ${i.employee?.firstName} ${i.employee?.lastName}`)
                      .join(' · ') || 'None yet'}
                  </Typography.Text>
                  <RecordNotes entityType="Consumable" entityId={r.id} canAdd={canManage} />
                </Space>
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
          <TablePagination
            total={total}
            page={page}
            pageSize={pageSize}
            onChange={(p, s) => {
              setPage(p);
              setPageSize(s);
            }}
          />
        </>
      )}

      <Modal
        open={createOpen}
        title="Add consumable"
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={busy}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={create}
          initialValues={{ lowStockThreshold: 5 }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input placeholder="Cables, Toner, Batteries, …" />
          </Form.Item>
          <Form.Item
            name="quantityTotal"
            label="Starting quantity"
            rules={[
              { required: true, type: 'integer', min: 0, message: 'Enter a whole number ≥ 0' },
            ]}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="lowStockThreshold"
            label="Low-stock threshold"
            rules={[{ type: 'integer', min: 0, message: 'Enter a whole number ≥ 0' }]}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!issueTarget}
        title={`Issue ${issueTarget?.name ?? ''}`}
        onCancel={() => {
          setIssueTarget(null);
          setEmployeeId(undefined);
          setIssueQty(1);
        }}
        onOk={() => void issue()}
        okText="Issue"
        okButtonProps={{ disabled: !employeeId }}
        confirmLoading={busy}
      >
        <Form layout="vertical">
          <Form.Item label="Employee" required>
            <EmployeeSelect value={employeeId} onChange={setEmployeeId} />
          </Form.Item>
          <Form.Item label={`Quantity (${issueTarget?.quantityAvailable ?? 0} available)`}>
            <InputNumber
              min={1}
              max={issueTarget?.quantityAvailable ?? 1}
              precision={0}
              value={issueQty}
              onChange={(v) => setIssueQty(Math.max(1, Number(v) || 1))}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
