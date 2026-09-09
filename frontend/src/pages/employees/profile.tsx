import { LaptopOutlined } from '@ant-design/icons';
import { useCustom } from '@refinedev/core';
import { Avatar, Card, Col, Descriptions, Row, Space, Statistic, Table, Typography } from 'antd';
import { Link, useParams } from 'react-router';
import { WarrantyDays } from '../../components/Cells';
import { StatusTag } from '../../components/StatusTag';

export function EmployeeProfile() {
  const { id } = useParams();
  const { query } = useCustom<any>({
    url: `employees/${id}/profile`,
    method: 'get',
    queryOptions: { queryKey: ['employee-profile', id], enabled: !!id },
  });
  const isFetching = query.isFetching;
  const emp = query.data?.data;
  const assets = emp?.assignedAssets ?? [];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card loading={isFetching}>
        <Row gutter={16} align="middle">
          <Col>
            <Avatar size={56}>
              {emp ? `${emp.firstName?.[0] ?? ''}${emp.lastName?.[0] ?? ''}` : ''}
            </Avatar>
          </Col>
          <Col flex="auto">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {emp ? `${emp.firstName} ${emp.lastName}` : ''}
            </Typography.Title>
            <Typography.Text type="secondary">
              {emp?.employeeCode} · {emp?.designation ?? '—'} · {emp?.location?.name}
            </Typography.Text>
          </Col>
          <Col>
            <Statistic title="Assigned assets" value={assets.length} prefix={<LaptopOutlined />} />
          </Col>
        </Row>

        <Descriptions column={2} size="small" style={{ marginTop: 16 }}>
          <Descriptions.Item label="Email">{emp?.email}</Descriptions.Item>
          <Descriptions.Item label="Phone">{emp?.phone ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Department">{emp?.department?.name ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Location">{emp?.location?.name ?? '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card size="small" title="Assigned assets (serialized hardware)">
        <Table
          dataSource={assets}
          rowKey="id"
          size="small"
          pagination={false}
          columns={[
            {
              title: 'Asset',
              dataIndex: 'assetCode',
              render: (v, r: any) => <Link to={`/assets/show/${r.id}`}>{v}</Link>,
            },
            {
              title: 'Category',
              dataIndex: ['category', 'name'],
              render: (_: unknown, r: any) => r.category?.name,
            },
            {
              title: 'Item',
              render: (_: unknown, r: any) => `${r.brand ?? ''} ${r.model ?? ''}`.trim() || '—',
            },
            { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
            {
              title: 'Warranty',
              dataIndex: 'warrantyEnd',
              render: (v) => <WarrantyDays warrantyEnd={v} />,
            },
          ]}
        />
      </Card>

      <Card size="small" title="Accessories checked out">
        <Table
          dataSource={emp?.accessoryCheckouts ?? []}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: 'No accessories checked out' }}
          columns={[
            { title: 'Item', render: (_: unknown, r: any) => r.accessory?.name },
            { title: 'Category', render: (_: unknown, r: any) => r.accessory?.category },
            { title: 'Qty', dataIndex: 'quantity' },
            {
              title: 'Since',
              dataIndex: 'checkedOutAt',
              render: (v) => (v ? new Date(v).toLocaleDateString() : '—'),
            },
          ]}
        />
      </Card>

      <Card size="small" title="Consumables issued">
        <Table
          dataSource={emp?.consumableIssues ?? []}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: 'No consumables issued' }}
          columns={[
            { title: 'Item', render: (_: unknown, r: any) => r.consumable?.name },
            { title: 'Category', render: (_: unknown, r: any) => r.consumable?.category },
            { title: 'Qty', dataIndex: 'quantity' },
            {
              title: 'Issued',
              dataIndex: 'issuedAt',
              render: (v) => (v ? new Date(v).toLocaleDateString() : '—'),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
