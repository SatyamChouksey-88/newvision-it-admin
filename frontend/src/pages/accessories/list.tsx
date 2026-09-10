import { PlusOutlined, RollbackOutlined, UserAddOutlined } from '@ant-design/icons';
import { useGetIdentity } from '@refinedev/core';
import { Button, Card, Form, Input, InputNumber, Modal, Space, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { PrimaryWithSub } from '../../components/Cells';
import { CopyButton } from '../../components/CopyButton';
import { DataGrid, type TableDensity } from '../../components/DataGrid/DataGrid';
import { EmployeeSelect } from '../../components/EmployeeSelect';
import { EmptyState } from '../../components/EmptyState';
import { StatusLegend } from '../../components/StatusLegend';
import { TablePagination } from '../../components/TablePagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useToast } from '../../components/Toast';
import type { Identity } from '../../providers/authProvider';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import { tabularNums } from '../../theme';
import type { Accessory } from '../../types';

const IT_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'IT_SUPPORT'];

export function AccessoriesPage() {
  const toast = useToast();
  const { data: identity } = useGetIdentity<Identity>();
  const canManage = ['SUPER_ADMIN', 'IT_ADMIN'].includes(identity?.role ?? '');
  const canCheckout = IT_ROLES.includes(identity?.role ?? '');
  const [rows, setRows] = useState<Accessory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [density, setDensity] = useState<TableDensity>('Compact');
  const [createOpen, setCreateOpen] = useState(false);
  const [checkoutTarget, setCheckoutTarget] = useState<Accessory | null>(null);
  const [employeeId, setEmployeeId] = useState<number>();
  const [form] = Form.useForm();

  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await httpClient.get('/accessories', {
        params: { _start: (page - 1) * pageSize, _end: page * pageSize },
      });
      setRows(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (values: { name: string; category: string; quantityTotal: number }) => {
    setBusy(true);
    try {
      await httpClient.post('/accessories', values);
      toast.success(`Added ${values.name}`);
      setCreateOpen(false);
      form.resetFields();
      void load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not add the accessory'));
    } finally {
      setBusy(false);
    }
  };

  const checkout = async () => {
    if (!checkoutTarget || !employeeId) {
      toast.warning('Pick an employee');
      return;
    }
    setBusy(true);
    try {
      await httpClient.post(`/accessories/${checkoutTarget.id}/checkout`, { employeeId });
      toast.success(`Checked out ${checkoutTarget.name}`);
      setCheckoutTarget(null);
      setEmployeeId(undefined);
      void load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Check-out failed'));
    } finally {
      setBusy(false);
    }
  };

  const checkin = async (accessoryId: number, checkoutId: number) => {
    try {
      await httpClient.post(`/accessories/${accessoryId}/checkin`, { checkoutId });
      toast.success('Checked in');
      void load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Check-in failed'));
    }
  };

  return (
    <Card
      title={
        <Space>
          Accessories
          <StatusLegend kind="asset" />
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
            Add accessory
          </Button>
        ) : null
      }
    >
      {loading && rows.length === 0 ? (
        <TableSkeleton />
      ) : loadError ? (
        <EmptyState
          description="Could not load accessories. Check your connection and try again."
          actionLabel="Retry"
          onAction={() => void load()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          description="No accessories in catalog"
          actionLabel={canManage ? 'Add accessory' : undefined}
          onAction={canManage ? () => setCreateOpen(true) : undefined}
        />
      ) : (
        <>
          <DataGrid<Accessory>
            tableKey="accessories"
            searchInputId="accessories-grid-search"
            rowKey="id"
            dataSource={rows}
            loading={loading}
            density={density}
            onDensityChange={setDensity}
            fixFirstColumn
            expandable={{
              expandedRowKeys: expanded,
              onExpandedRowsChange: (keys) => setExpanded(keys as number[]),
              expandedRowRender: (r) =>
                (r.checkouts ?? []).length === 0 ? (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    No open checkouts
                  </Typography.Text>
                ) : (
                  <Space wrap size={[8, 4]}>
                    {(r.checkouts ?? []).map((c) => (
                      <Space key={c.id} size={4}>
                        <Typography.Text style={{ fontSize: 12 }}>
                          {c.quantity}× → {c.employee?.firstName} {c.employee?.lastName} (
                          {c.employee?.employeeCode})
                        </Typography.Text>
                        {canCheckout && (
                          <Button
                            size="small"
                            type="link"
                            style={{ padding: 0, height: 'auto' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              void checkin(r.id, c.id);
                            }}
                          >
                            Check in
                          </Button>
                        )}
                      </Space>
                    ))}
                  </Space>
                ),
            }}
            columns={[
              {
                title: 'ID',
                gridKey: 'id',
                dataIndex: 'id',
                defaultWidth: 72,
                render: (v: number) => (
                  <Space size={4}>
                    {v}
                    <CopyButton value={String(v)} label="accessory id" />
                  </Space>
                ),
              },
              {
                title: 'Item',
                gridKey: 'item',
                render: (_, r) => (
                  <Space size={4}>
                    <PrimaryWithSub primary={r.name} sub={r.category} />
                    <CopyButton value={r.name} label="accessory name" />
                  </Space>
                ),
              },
              {
                title: 'Total',
                dataIndex: 'quantityTotal',
                align: 'right',
                sorter: (a, b) => a.quantityTotal - b.quantityTotal,
                render: (v) => <span style={tabularNums}>{v}</span>,
              },
              {
                title: 'Checked out',
                dataIndex: 'quantityCheckedOut',
                align: 'right',
                sorter: (a, b) => a.quantityCheckedOut - b.quantityCheckedOut,
                render: (v) => <span style={tabularNums}>{v}</span>,
              },
              {
                title: 'Available',
                dataIndex: 'quantityAvailable',
                align: 'right',
                sorter: (a, b) => a.quantityAvailable - b.quantityAvailable,
                render: (v) => <span style={tabularNums}>{v}</span>,
              },
              {
                title: 'Actions',
                gridKey: 'actions',
                exportable: false,
                render: (_, r) => (
                  <Space size={4}>
                    {canCheckout && r.quantityAvailable > 0 && (
                      <Button
                        size="small"
                        icon={<UserAddOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCheckoutTarget(r);
                        }}
                      >
                        Check out
                      </Button>
                    )}
                    {canCheckout &&
                      (r.checkouts ?? []).slice(0, 3).map((c) => (
                        <Button
                          key={c.id}
                          size="small"
                          icon={<RollbackOutlined />}
                          title={`Check in ${c.quantity}× from ${c.employee?.firstName ?? ''} ${c.employee?.lastName ?? ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            void checkin(r.id, c.id);
                          }}
                        >
                          Check in · {c.employee?.employeeCode ?? `#${c.id}`}
                        </Button>
                      ))}
                    {canCheckout && (r.checkouts?.length ?? 0) > 3 && (
                      <Button
                        size="small"
                        type="link"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpanded((prev) => (prev.includes(r.id) ? prev : [...prev, r.id]));
                        }}
                      >
                        +{(r.checkouts?.length ?? 0) - 3} more
                      </Button>
                    )}
                  </Space>
                ),
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
        title="Add accessory"
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={busy}
      >
        <Form form={form} layout="vertical" onFinish={create}>
          <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input placeholder="Peripherals, Bags, …" />
          </Form.Item>
          <Form.Item
            name="quantityTotal"
            label="Quantity"
            rules={[
              { required: true, type: 'integer', min: 0, message: 'Enter a whole number ≥ 0' },
            ]}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!checkoutTarget}
        title={`Check out ${checkoutTarget?.name ?? ''}`}
        onCancel={() => {
          setCheckoutTarget(null);
          setEmployeeId(undefined);
        }}
        onOk={() => void checkout()}
        okText="Check out"
        okButtonProps={{ disabled: !employeeId }}
        confirmLoading={busy}
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          {checkoutTarget?.quantityAvailable ?? 0} available. One unit is checked out per action.
        </Typography.Paragraph>
        <EmployeeSelect value={employeeId} onChange={setEmployeeId} />
      </Modal>
    </Card>
  );
}
