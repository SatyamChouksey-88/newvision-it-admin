import { Show } from '@refinedev/antd';
import { useGetIdentity, useShow } from '@refinedev/core';
import { Alert, App as AntdApp, Button, Card, Descriptions, Space, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { AssetStatusSelect } from '../../components/AssetStatusSelect';
import { WarrantyDays } from '../../components/Cells';
import { CopyButton } from '../../components/CopyButton';
import { DataGrid } from '../../components/DataGrid/DataGrid';
import { ManualEditButton } from '../../components/ManualEdit';
import { MaintenanceStatusTag } from '../../components/MaintenanceStatusTag';
import { RecordNotes } from '../../components/RecordNotes';
import { StatusTag } from '../../components/StatusTag';
import type { Identity } from '../../providers/authProvider';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import type { AssetStatus } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';

function EmployeeLink({
  emp,
  fallbackId,
}: {
  emp?: { id: number; firstName: string; lastName: string; employeeCode?: string } | null;
  fallbackId?: number | null;
}) {
  if (emp) {
    return (
      <Link to={`/employees/show/${emp.id}`}>
        {emp.firstName} {emp.lastName}
        {emp.employeeCode ? ` (${emp.employeeCode})` : ''}
      </Link>
    );
  }
  return fallbackId ? <Link to={`/employees/show/${fallbackId}`}>#{fallbackId}</Link> : <>—</>;
}

export function AssetShow() {
  const { message } = AntdApp.useApp();
  const { data: identity } = useGetIdentity<Identity>();
  const canManage = ['SUPER_ADMIN', 'IT_ADMIN'].includes(identity?.role ?? '');
  const { query } = useShow({ resource: 'assets' });
  const asset: any = query.data?.data;
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const changeStatus = async (status: AssetStatus) => {
    if (!asset?.id) return;
    try {
      await httpClient.post(`/assets/${asset.id}/status`, { status });
      message.success(`Status updated to ${status.replace('_', ' ')}`);
      void query.refetch();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not change status'));
    }
  };

  useEffect(() => {
    if (!asset?.id) return;
    let objectUrl: string | null = null;
    httpClient
      .get(`/assets/${asset.id}/qr`, { responseType: 'blob' })
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data);
        setQrUrl(objectUrl);
      })
      .catch(() => setQrUrl(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [asset?.id]);

  return (
    <Show
      isLoading={query.isLoading}
      title={asset?.assetCode ?? 'Asset'}
      goBack={false}
      headerButtons={
        canManage && asset ? (
          <ManualEditButton
            entityType="Asset"
            id={asset.id}
            fields={[
              { name: 'brand', label: 'Brand', value: asset.brand },
              { name: 'model', label: 'Model', value: asset.model },
              { name: 'serialNumber', label: 'Serial', value: asset.serialNumber },
              { name: 'status', label: 'Status', value: asset.status },
              { name: 'vendor', label: 'Vendor', value: asset.vendor },
              { name: 'createdAt', label: 'Created at', value: asset.createdAt },
            ]}
            onSaved={() => void query.refetch()}
          />
        ) : undefined
      }
    >
      {query.isError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Could not load this asset"
          description="It may have been deleted, or you may not have access to it."
        />
      )}
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Asset Code">
            <Space size={4}>
              {asset?.assetCode}
              {asset?.assetCode ? <CopyButton value={asset.assetCode} label="asset code" /> : null}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            {asset ? (
              canManage ? (
                <AssetStatusSelect value={asset.status} onChange={(s) => void changeStatus(s)} />
              ) : (
                <StatusTag status={asset.status} />
              )
            ) : null}
          </Descriptions.Item>
          <Descriptions.Item label="Category">{asset?.category?.name}</Descriptions.Item>
          <Descriptions.Item label="Condition">
            {asset?.condition ? <Tag>{asset.condition}</Tag> : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Brand / Model">
            {`${asset?.brand ?? ''} ${asset?.model ?? ''}`.trim() || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Serial Number">
            {asset?.serialNumber ? (
              <Space size={4}>
                {asset.serialNumber}
                <CopyButton value={asset.serialNumber} label="serial number" />
              </Space>
            ) : (
              '—'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Location">{asset?.location?.name}</Descriptions.Item>
          <Descriptions.Item label="Department">{asset?.department?.name ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Assigned To">
            {asset?.assignedEmployee ? (
              <Link to={`/employees/show/${asset.assignedEmployee.id}`}>
                {asset.assignedEmployee.firstName} {asset.assignedEmployee.lastName}
              </Link>
            ) : (
              '—'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Purchase Cost">
            {formatCurrency(asset?.purchaseCost)}
          </Descriptions.Item>
          <Descriptions.Item label="Purchase Date">
            {formatDate(asset?.purchaseDate)}
          </Descriptions.Item>
          <Descriptions.Item label="Warranty End">
            {asset ? <WarrantyDays warrantyEnd={asset.warrantyEnd} /> : null}
          </Descriptions.Item>
          <Descriptions.Item label="Vendor">{asset?.vendor ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Invoice No">{asset?.invoiceNo ?? '—'}</Descriptions.Item>
        </Descriptions>

        <Card size="small" title="QR sticker (scan to view)">
          <Space align="start" size={16}>
            {qrUrl ? (
              <img src={qrUrl} alt={`QR for ${asset?.assetCode}`} width={160} height={160} />
            ) : (
              <Typography.Text type="secondary">Generating…</Typography.Text>
            )}
            <Space direction="vertical">
              <Typography.Text type="secondary">
                Print this on the device. A phone camera opens a public audit card — no login.
              </Typography.Text>
              {asset?.assetCode && <Link to={`/scan/${asset.assetCode}`}>Open scan page</Link>}
              {qrUrl && (
                <Button
                  size="small"
                  href={qrUrl}
                  download={`${asset?.assetCode ?? 'asset'}-qr.png`}
                >
                  Download PNG
                </Button>
              )}
            </Space>
          </Space>
        </Card>

        <Card size="small" title="Assignment history">
          <DataGrid<any>
            tableKey={`asset-${asset?.id ?? 'x'}-assignments`}
            dataSource={asset?.assignments ?? []}
            rowKey="id"
            density="Compact"
            pagination={{ pageSize: 10, hideOnSinglePage: true, size: 'small' }}
            columns={[
              {
                title: 'Employee',
                gridKey: 'employee',
                render: (_, r: any) => <EmployeeLink emp={r.employee} fallbackId={r.employeeId} />,
                getExportValue: (r: any) =>
                  r.employee
                    ? `${r.employee.firstName} ${r.employee.lastName}`
                    : String(r.employeeId ?? ''),
              },
              {
                title: 'Assigned by',
                gridKey: 'assignedBy',
                render: (_: unknown, r: any) => r.assignedBy?.fullName ?? '—',
                getExportValue: (r: any) => r.assignedBy?.fullName ?? '',
              },
              {
                title: 'Assigned',
                dataIndex: 'assignedAt',
                render: (v) => formatDate(v),
              },
              {
                title: 'Returned',
                dataIndex: 'returnedAt',
                render: (v) =>
                  v ? (
                    formatDate(v)
                  ) : (
                    <Tag style={{ color: '#15803D', background: '#F0FDF4', borderColor: '#BBF7D0' }}>
                      Active
                    </Tag>
                  ),
                getExportValue: (r: any) => r.returnedAt ?? 'Active',
              },
              { title: 'Notes', dataIndex: 'notes', render: (v) => v ?? '—' },
            ]}
          />
        </Card>

        <Card size="small" title="Maintenance history">
          <DataGrid<any>
            tableKey={`asset-${asset?.id ?? 'x'}-maintenance`}
            dataSource={asset?.maintenance ?? []}
            rowKey="id"
            density="Compact"
            pagination={{ pageSize: 10, hideOnSinglePage: true, size: 'small' }}
            columns={[
              { title: 'Issue', dataIndex: 'issue' },
              {
                title: 'Status',
                dataIndex: 'status',
                render: (v) => <MaintenanceStatusTag status={v} />,
              },
              { title: 'Vendor', dataIndex: 'vendor', render: (v) => v ?? '—' },
              {
                title: 'Est. Cost',
                dataIndex: 'estimatedCost',
                render: (v) => formatCurrency(v),
              },
              { title: 'Reported', dataIndex: 'reportedAt', render: (v) => formatDate(v) },
            ]}
          />
        </Card>

        {(asset?.transfers?.length ?? 0) > 0 && (
          <Card size="small" title="Transfer history">
            <DataGrid<any>
              tableKey={`asset-${asset?.id ?? 'x'}-transfers`}
              dataSource={asset?.transfers ?? []}
              rowKey="id"
              density="Compact"
              pagination={{ pageSize: 10, hideOnSinglePage: true, size: 'small' }}
              columns={[
                {
                  title: 'From',
                  gridKey: 'fromEmployee',
                  render: (_: unknown, r: any) => (
                    <EmployeeLink emp={r.fromEmployee} fallbackId={r.fromEmployeeId} />
                  ),
                  getExportValue: (r: any) =>
                    r.fromEmployee
                      ? `${r.fromEmployee.firstName} ${r.fromEmployee.lastName}`
                      : String(r.fromEmployeeId ?? ''),
                },
                {
                  title: 'To',
                  gridKey: 'toEmployee',
                  render: (_: unknown, r: any) => (
                    <EmployeeLink emp={r.toEmployee} fallbackId={r.toEmployeeId} />
                  ),
                  getExportValue: (r: any) =>
                    r.toEmployee
                      ? `${r.toEmployee.firstName} ${r.toEmployee.lastName}`
                      : String(r.toEmployeeId ?? ''),
                },
                {
                  title: 'Location',
                  gridKey: 'location',
                  render: (_: unknown, r: any) =>
                    r.fromLocation?.code &&
                    r.toLocation?.code &&
                    r.fromLocation.code !== r.toLocation.code
                      ? `${r.fromLocation.code} → ${r.toLocation.code}`
                      : (r.toLocation?.code ?? '—'),
                  getExportValue: (r: any) =>
                    r.fromLocation?.code && r.toLocation?.code
                      ? `${r.fromLocation.code} → ${r.toLocation.code}`
                      : (r.toLocation?.code ?? ''),
                },
                { title: 'When', dataIndex: 'transferredAt', render: (v) => formatDate(v) },
                { title: 'Reason', dataIndex: 'reason', render: (v) => v ?? '—' },
              ]}
            />
          </Card>
        )}

        <RecordNotes entityType="Asset" entityId={asset?.id} canAdd={canManage} />

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Every change to this asset is recorded in the audit log.
        </Typography.Text>
      </Space>
    </Show>
  );
}
