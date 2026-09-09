import { LaptopOutlined, LogoutOutlined } from '@ant-design/icons';
import { useCustom, useGetIdentity } from '@refinedev/core';
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Statistic,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { CopyButton } from '../../components/CopyButton';
import { WarrantyDays } from '../../components/Cells';
import { DataGrid, type TableDensity } from '../../components/DataGrid/DataGrid';
import { EmployeeSelect } from '../../components/EmployeeSelect';
import { StatusTag } from '../../components/StatusTag';
import { useToast } from '../../components/Toast';
import type { Identity } from '../../providers/authProvider';
import { httpClient } from '../../providers/axios';

interface HistoryEvent {
  id: string;
  at: string;
  kind: string;
  summary: string;
  detail?: string;
  href?: string;
}

export function EmployeeProfile() {
  const { id } = useParams();
  const toast = useToast();
  const { data: identity } = useGetIdentity<Identity>();
  const canOffboard = ['SUPER_ADMIN', 'IT_ADMIN'].includes(identity?.role ?? '');
  const [density, setDensity] = useState<TableDensity>('Compact');
  const [offboardOpen, setOffboardOpen] = useState(false);
  const [reassignTo, setReassignTo] = useState<number>();
  const [offboardNotes, setOffboardNotes] = useState('');
  const [offboarding, setOffboarding] = useState(false);

  const { query } = useCustom<any>({
    url: `employees/${id}/profile`,
    method: 'get',
    queryOptions: { queryKey: ['employee-profile', id], enabled: !!id },
  });
  const { query: historyQuery } = useCustom<HistoryEvent[]>({
    url: `employees/${id}/history`,
    method: 'get',
    queryOptions: { queryKey: ['employee-history', id], enabled: !!id },
  });

  const isFetching = query.isFetching;
  const emp = query.data?.data;
  const assets = emp?.assignedAssets ?? [];
  const history = historyQuery.data?.data ?? [];

  const runOffboard = async () => {
    setOffboarding(true);
    try {
      await httpClient.post(`/employees/${id}/offboard`, {
        notes: offboardNotes || undefined,
        reassignAssetsToId: reassignTo,
        returnAssets: !reassignTo,
      });
      toast.success(`${emp?.employeeCode} offboarded — assets and accessories dispositioned`);
      setOffboardOpen(false);
      void query.refetch();
      void historyQuery.refetch();
    } catch {
      toast.error('Offboarding failed — check assets are not under repair');
    } finally {
      setOffboarding(false);
    }
  };

  const overview = (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Descriptions column={2} size="small">
        <Descriptions.Item label="Email">
          <Space size={4}>
            {emp?.email}
            {emp?.email ? <CopyButton value={emp.email} label="email" /> : null}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Phone">{emp?.phone ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Department">{emp?.department?.name ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Location">{emp?.location?.name ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Status">
          {emp?.isActive === false ? <Tag color="default">Inactive</Tag> : <Tag color="success">Active</Tag>}
        </Descriptions.Item>
      </Descriptions>

      <Card size="small" title="Assigned assets (serialized hardware)">
        <DataGrid<any>
          tableKey={`employee-${id}-assets`}
          rowKey="id"
          dataSource={assets}
          density={density}
          onDensityChange={setDensity}
          fixFirstColumn
          columns={[
            {
              title: 'Asset',
              gridKey: 'assetCode',
              render: (_, r: { id: number; assetCode: string }) => (
                <Space size={4}>
                  <Link to={`/assets/show/${r.id}`}>{r.assetCode}</Link>
                  <CopyButton value={r.assetCode} label="asset code" />
                </Space>
              ),
            },
            {
              title: 'Category',
              render: (_: unknown, r: { category?: { name?: string } }) => r.category?.name ?? '—',
            },
            {
              title: 'Item',
              render: (_: unknown, r: { brand?: string; model?: string }) =>
                `${r.brand ?? ''} ${r.model ?? ''}`.trim() || '—',
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
        <DataGrid<any>
          tableKey={`employee-${id}-accessories`}
          rowKey="id"
          dataSource={emp?.accessoryCheckouts ?? []}
          density={density}
          quickFilter={false}
          columns={[
            { title: 'Item', render: (_: unknown, r: { accessory?: { name?: string } }) => r.accessory?.name },
            { title: 'Category', render: (_: unknown, r: { accessory?: { category?: string } }) => r.accessory?.category },
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
        <DataGrid<any>
          tableKey={`employee-${id}-consumables`}
          rowKey="id"
          dataSource={emp?.consumableIssues ?? []}
          density={density}
          quickFilter={false}
          columns={[
            { title: 'Item', render: (_: unknown, r: { consumable?: { name?: string } }) => r.consumable?.name },
            { title: 'Category', render: (_: unknown, r: { consumable?: { category?: string } }) => r.consumable?.category },
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

  const historyTab = (
    <DataGrid<HistoryEvent>
      tableKey={`employee-${id}-history`}
      rowKey="id"
      dataSource={history}
      loading={historyQuery.isFetching}
      density={density}
      onDensityChange={setDensity}
      fixFirstColumn
      columns={[
        {
          title: 'When',
          gridKey: 'at',
          defaultWidth: 160,
          sorter: (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
          render: (_, r) => new Date(r.at).toLocaleString(),
          getExportValue: (r) => r.at,
        },
        { title: 'Type', dataIndex: 'kind', defaultWidth: 160 },
        {
          title: 'Summary',
          dataIndex: 'summary',
          render: (_, r) =>
            r.href ? (
              <Link to={r.href}>{r.summary}</Link>
            ) : (
              r.summary
            ),
        },
        {
          title: 'Detail',
          dataIndex: 'detail',
          render: (v) => v ?? '—',
        },
      ]}
    />
  );

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
            <Space align="center">
              <Typography.Title level={4} style={{ margin: 0 }}>
                {emp ? `${emp.firstName} ${emp.lastName}` : ''}
              </Typography.Title>
              {emp?.isActive === false ? <Tag>Inactive</Tag> : null}
            </Space>
            <Typography.Text type="secondary">
              <Space size={4}>
                {emp?.employeeCode}
                {emp?.employeeCode ? <CopyButton value={emp.employeeCode} label="employee code" /> : null}
                · {emp?.designation ?? '—'} · {emp?.location?.name}
              </Space>
            </Typography.Text>
          </Col>
          <Col>
            <Space>
              <Statistic title="Assigned assets" value={assets.length} prefix={<LaptopOutlined />} />
              {canOffboard && emp?.isActive !== false && (
                <Button danger icon={<LogoutOutlined />} onClick={() => setOffboardOpen(true)}>
                  Offboard
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      <Tabs
        items={[
          { key: 'overview', label: 'Overview', children: overview },
          { key: 'history', label: 'History', children: historyTab },
        ]}
      />

      <Modal
        open={offboardOpen}
        title={`Offboard ${emp?.firstName ?? ''} ${emp?.lastName ?? ''}`}
        okText="Offboard employee"
        okButtonProps={{ danger: true, loading: offboarding }}
        onCancel={() => setOffboardOpen(false)}
        onOk={() => void runOffboard()}
      >
        <Typography.Paragraph type="secondary">
          Returns assigned assets to the available pool (or reassigns them), checks in open accessories,
          deactivates the login account, and preserves all historical records.
        </Typography.Paragraph>
        <Form layout="vertical">
          <Form.Item label="Reassign assets to (optional)">
            <EmployeeSelect value={reassignTo} onChange={setReassignTo} placeholder="Leave blank to return to pool" />
          </Form.Item>
          <Form.Item label="Notes">
            <Input.TextArea rows={2} value={offboardNotes} onChange={(e) => setOffboardNotes(e.target.value)} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
