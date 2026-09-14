import { PlusOutlined, RollbackOutlined, UserAddOutlined } from '@ant-design/icons';
import { useGetIdentity } from '@refinedev/core';
import {
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { PrimaryWithSub } from '../../components/Cells';
import { CopyButton } from '../../components/CopyButton';
import { DataGrid, type TableDensity } from '../../components/DataGrid/DataGrid';
import { EmployeeSelect } from '../../components/EmployeeSelect';
import { EmptyState } from '../../components/EmptyState';
import { RecordNotes } from '../../components/RecordNotes';
import { StatusLegend } from '../../components/StatusLegend';
import { TablePagination } from '../../components/TablePagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useToast } from '../../components/Toast';
import type { Identity } from '../../providers/authProvider';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import { tabularNums } from '../../theme';
import { HardwareTabs } from '../../components/HardwareTabs';
import { InventoryDecision } from '../../components/InventoryDecision';
import { AssetSelect } from '../../components/AssetSelect';
import { NV_TABLE_STICKY } from '../../chrome';
import { useNvPhone } from '../../hooks/useNvPhone';
import type { Accessory, Location } from '../../types';

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
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [createOpen, setCreateOpen] = useState(false);
  const [checkoutTarget, setCheckoutTarget] = useState<Accessory | null>(null);
  const [employeeId, setEmployeeId] = useState<number>();
  const [checkoutQty, setCheckoutQty] = useState(1);
  const [checkoutSerial, setCheckoutSerial] = useState('');
  const [issuedWithAssetId, setIssuedWithAssetId] = useState<number>();
  const [dueBack, setDueBack] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [form] = Form.useForm();
  const phone = useNvPhone();

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

  useEffect(() => {
    httpClient
      .get('/locations', { params: { _start: 0, _end: 100 } })
      .then(({ data }) => setLocations(data.data ?? []))
      .catch(() => undefined);
  }, []);

  const create = async (values: {
    name: string;
    category: string;
    quantityTotal: number;
    brand?: string;
    model?: string;
    locationId?: number;
    lowStockThreshold?: number;
    estateWide?: boolean;
  }) => {
    setBusy(true);
    try {
      await httpClient.post('/accessories', {
        name: values.name,
        category: values.category,
        quantityTotal: values.quantityTotal,
        brand: values.brand || undefined,
        model: values.model || undefined,
        locationId: values.estateWide ? null : values.locationId,
        lowStockThreshold: values.lowStockThreshold ?? 5,
      });
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
      await httpClient.post(`/accessories/${checkoutTarget.id}/checkout`, {
        employeeId,
        quantity: checkoutQty,
        serialNumber: checkoutSerial.trim() || undefined,
        issuedWithAssetId,
        expectedReturnAt: dueBack || undefined,
      });
      toast.success(`Checked out ${checkoutTarget.name}`);
      setCheckoutTarget(null);
      setEmployeeId(undefined);
      setCheckoutQty(1);
      setCheckoutSerial('');
      setIssuedWithAssetId(undefined);
      setDueBack('');
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
      className="nv-list-page"
      title={
        <span>
          Accessories
          <HardwareTabs />
        </span>
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
      <div className="nv-page-pin">
      <div className="nv-filter-row">
        <Segmented
          size="small"
          value={phone ? 'cards' : view}
          onChange={(v) => setView(v as 'cards' | 'table')}
          options={[
            { label: 'Cards', value: 'cards' },
            { label: 'Table', value: 'table' },
          ]}
        />
      </div>
      </div>
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
          {(phone || view === 'cards') ? (
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              {rows.map((r) => {
                const avail = r.quantityAvailable;
                const pct = r.quantityTotal > 0 ? Math.round((avail / r.quantityTotal) * 100) : 0;
                const low =
                  avail <= (r.lowStockThreshold ?? Math.max(1, Math.round(r.quantityTotal * 0.15)));
                return (
                  <Col xs={24} sm={12} lg={8} xl={6} key={r.id}>
                    <div className="nv-stock-card">
                      <Typography.Text strong style={{ fontSize: 13 }}>
                        {r.name}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {[r.brand, r.model].filter(Boolean).join(' ') || r.category}
                      </Typography.Text>
                      <div
                        style={{
                          ...tabularNums,
                          fontSize: 22,
                          fontWeight: 600,
                          color: low ? '#B45309' : '#1F1F1F',
                        }}
                      >
                        {avail}
                        <span style={{ fontSize: 11, color: '#64748B', marginLeft: 6 }}>
                          / {r.quantityTotal}
                        </span>
                      </div>
                      <div className={`nv-stock-bar${low ? ' is-low' : ''}`}>
                        <span style={{ width: `${pct}%` }} />
                      </div>
                      <Typography.Text style={{ fontSize: 11, color: low ? '#B45309' : '#64748B' }}>
                        {low ? 'Below comfortable stock — restock soon' : 'Threshold healthy'}
                      </Typography.Text>
                      {canCheckout && r.quantityAvailable > 0 && (
                        <Button
                          size="small"
                          icon={<UserAddOutlined />}
                          onClick={() => setCheckoutTarget(r)}
                        >
                          Issue
                        </Button>
                      )}
                    </div>
                  </Col>
                );
              })}
            </Row>
          ) : null}
          {!phone && view === 'table' && (
            <DataGrid<Accessory>
              tableKey="accessories"
              searchInputId="accessories-grid-search"
              rowKey="id"
              dataSource={rows}
              loading={loading}
              density={density}
              onDensityChange={setDensity}
              sticky={NV_TABLE_STICKY}
              quickFilter
              quickFilterPlaceholder="Search accessories"
              toolbarExtra={<StatusLegend kind="asset" />}
              fixFirstColumn
              expandable={{
                expandedRowKeys: expanded,
                onExpandedRowsChange: (keys) => setExpanded(keys as number[]),
                expandedRowRender: (r) => (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {(r.checkouts ?? []).length === 0 ? (
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
                              <Popconfirm
                                title={`Check in this accessory from ${c.employee?.firstName ?? ''} ${c.employee?.lastName ?? ''}?`}
                                okText="Check in"
                                onConfirm={() => void checkin(r.id, c.id)}
                              >
                                <Button
                                  size="small"
                                  type="link"
                                  style={{ padding: 0, height: 'auto' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Check in
                                </Button>
                              </Popconfirm>
                            )}
                          </Space>
                        ))}
                      </Space>
                    )}
                    <RecordNotes entityType="Accessory" entityId={r.id} canAdd={canManage} />
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
                      <PrimaryWithSub
                        primary={r.name}
                        sub={[r.brand, r.model, r.category].filter(Boolean).join(' · ')}
                      />
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
          )}
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
        onCancel={() => {
          setCreateOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={busy}
      >
        <InventoryDecision variant="accessory" />
        <Form
          form={form}
          layout="vertical"
          onFinish={create}
          initialValues={{ category: 'Peripherals', lowStockThreshold: 5 }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="brand" label="Brand">
            <Input />
          </Form.Item>
          <Form.Item name="model" label="Model">
            <Input />
          </Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true, whitespace: true }]}>
            <Select
              options={[
                { label: 'Peripherals', value: 'Peripherals' },
                { label: 'Audio', value: 'Audio' },
                { label: 'Power', value: 'Power' },
                { label: 'Cables', value: 'Cables' },
                { label: 'Bags', value: 'Bags' },
                { label: 'Other', value: 'Other' },
              ]}
            />
          </Form.Item>
          <Form.Item name="estateWide" valuePropName="checked">
            <Checkbox>Estate-wide (no site)</Checkbox>
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(a, b) => a.estateWide !== b.estateWide}>
            {({ getFieldValue }) =>
              getFieldValue('estateWide') ? null : (
                <Form.Item
                  name="locationId"
                  label="Location"
                  rules={[{ required: true, message: 'Pick a location or mark estate-wide' }]}
                >
                  <Select
                    options={locations.map((l) => ({ label: `${l.name} (${l.code})`, value: l.id }))}
                    showSearch
                    optionFilterProp="label"
                  />
                </Form.Item>
              )
            }
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
          <Form.Item name="lowStockThreshold" label="Low-stock threshold">
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
          setCheckoutQty(1);
          setCheckoutSerial('');
          setIssuedWithAssetId(undefined);
          setDueBack('');
        }}
        onOk={() => void checkout()}
        okText="Check out"
        okButtonProps={{ disabled: !employeeId }}
        confirmLoading={busy}
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          {checkoutTarget?.quantityAvailable ?? 0} available.
        </Typography.Paragraph>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <EmployeeSelect value={employeeId} onChange={setEmployeeId} />
          <InputNumber
            min={1}
            max={checkoutTarget?.quantityAvailable ?? 1}
            value={checkoutQty}
            onChange={(v) => setCheckoutQty(Number(v ?? 1))}
            addonBefore="Qty"
            style={{ width: '100%' }}
          />
          <Input
            placeholder="Optional serial / sticker"
            value={checkoutSerial}
            onChange={(e) => setCheckoutSerial(e.target.value)}
          />
          <AssetSelect value={issuedWithAssetId} onChange={setIssuedWithAssetId} />
          <Input type="date" value={dueBack} onChange={(e) => setDueBack(e.target.value)} aria-label="Due back" />
        </Space>
      </Modal>
    </Card>
  );
}
