import { Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Button, Card, Descriptions, Space, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CopyButton } from '../../components/CopyButton';
import { WarrantyDays } from '../../components/Cells';
import { StatusTag } from '../../components/StatusTag';
import { httpClient } from '../../providers/axios';
import { formatCurrency, formatDate } from '../../utils/format';

export function AssetShow() {
  const { query } = useShow({ resource: 'assets' });
  const asset: any = query.data?.data;
  const [qrUrl, setQrUrl] = useState<string | null>(null);

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
    <Show isLoading={query.isFetching} title={asset?.assetCode ?? 'Asset'}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Asset Code">
            <Space size={4}>
              {asset?.assetCode}
              {asset?.assetCode ? <CopyButton value={asset.assetCode} label="asset code" /> : null}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            {asset ? <StatusTag status={asset.status} /> : null}
          </Descriptions.Item>
          <Descriptions.Item label="Category">{asset?.category?.name}</Descriptions.Item>
          <Descriptions.Item label="Condition">
            <Tag>{asset?.condition}</Tag>
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
              {asset?.assetCode && (
                <Link to={`/scan/${asset.assetCode}`}>Open scan page</Link>
              )}
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
          <Table
            dataSource={asset?.assignments ?? []}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: 'Employee ID', dataIndex: 'employeeId' },
              { title: 'Assigned', dataIndex: 'assignedAt', render: (v) => formatDate(v) },
              {
                title: 'Returned',
                dataIndex: 'returnedAt',
                render: (v) => (v ? formatDate(v) : <Tag color="green">Active</Tag>),
              },
              { title: 'Notes', dataIndex: 'notes', render: (v) => v ?? '—' },
            ]}
          />
        </Card>

        <Card size="small" title="Maintenance history">
          <Table
            dataSource={asset?.maintenance ?? []}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: 'Issue', dataIndex: 'issue' },
              { title: 'Status', dataIndex: 'status', render: (v) => <Tag>{v}</Tag> },
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
            <Table
              dataSource={asset?.transfers ?? []}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: 'From Emp', dataIndex: 'fromEmployeeId', render: (v) => v ?? '—' },
                { title: 'To Emp', dataIndex: 'toEmployeeId', render: (v) => v ?? '—' },
                { title: 'When', dataIndex: 'transferredAt', render: (v) => formatDate(v) },
                { title: 'Reason', dataIndex: 'reason', render: (v) => v ?? '—' },
              ]}
            />
          </Card>
        )}

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Every change to this asset is recorded in the audit log.
        </Typography.Text>
      </Space>
    </Show>
  );
}
