import { LaptopOutlined, LogoutOutlined, UndoOutlined } from '@ant-design/icons';
import { useCustom, useGetIdentity } from '@refinedev/core';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { WarrantyDays } from '../../components/Cells';
import { CopyButton } from '../../components/CopyButton';
import { DataGrid, type TableDensity } from '../../components/DataGrid/DataGrid';
import { EmployeeSelect } from '../../components/EmployeeSelect';
import { ManualEditButton } from '../../components/ManualEdit';
import { RecordNotes } from '../../components/RecordNotes';
import { StatusTag } from '../../components/StatusTag';
import { useToast } from '../../components/Toast';
import type { Identity } from '../../providers/authProvider';
import { apiErrorMessage, httpClient } from '../../providers/axios';

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
  const navigate = useNavigate();
  const toast = useToast();
  const { data: identity } = useGetIdentity<Identity>();
  const canOffboard = ['SUPER_ADMIN', 'IT_ADMIN'].includes(identity?.role ?? '');
  const [density, setDensity] = useState<TableDensity>('Compact');
  const [offboardOpen, setOffboardOpen] = useState(false);
  const [reassignTo, setReassignTo] = useState<number>();
  const [offboardNotes, setOffboardNotes] = useState('');
  const [offboarding, setOffboarding] = useState(false);
  const [reinstating, setReinstating] = useState(false);

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
      toast.success(
        `${emp?.employeeCode} offboarded — ${assets.length} asset${assets.length === 1 ? '' : 's'} ${
          reassignTo ? 'reassigned' : 'returned to pool'
        }, ${emp?.accessoryCheckouts?.length ?? 0} accessor${
          (emp?.accessoryCheckouts?.length ?? 0) === 1 ? 'y' : 'ies'
        } checked in`,
      );
      setOffboardOpen(false);
      setReassignTo(undefined);
      setOffboardNotes('');
      void query.refetch();
      void historyQuery.refetch();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Offboarding failed'));
    } finally {
      setOffboarding(false);
    }
  };

  const runReinstate = async () => {
    setReinstating(true);
    try {
      await httpClient.post(`/employees/${id}/reinstate`);
      toast.success(`${emp?.employeeCode} reinstated — login re-enabled`);
      void query.refetch();
      void historyQuery.refetch();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Reinstate failed'));
    } finally {
      setReinstating(false);
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
          {emp?.isActive === false ? (
            <Tag color="default">Inactive</Tag>
          ) : (
            <Tag color="success">Active</Tag>
          )}
        </Descriptions.Item>
      </Descriptions>

      {canOffboard && emp ? (
        <ManualEditButton
          entityType="Employee"
          id={emp.id}
          fields={[
            { name: 'firstName', label: 'First name', value: emp.firstName },
            { name: 'lastName', label: 'Last name', value: emp.lastName },
            { name: 'email', label: 'Email', value: emp.email },
            { name: 'phone', label: 'Phone', value: emp.phone },
            { name: 'designation', label: 'Designation', value: emp.designation },
          ]}
          onSaved={() => void query.refetch()}
        />
      ) : null}

      <RecordNotes entityType="Employee" entityId={emp?.id} canAdd={canOffboard} />

      {emp?.isActive === false && (
        <Alert
          type="warning"
          showIcon
          message="This employee has been offboarded."
          description="They no longer appear in assignment pickers and their login is disabled. History below is preserved."
        />
      )}

      <Card size="small" title="Accessories checked out">
        <DataGrid<any>
          tableKey={`employee-${id}-accessories`}
          rowKey="id"
          dataSource={emp?.accessoryCheckouts ?? []}
          density={density}
          quickFilter={false}
          columns={[
            {
              title: 'Item',
              render: (_: unknown, r: { accessory?: { name?: string } }) => r.accessory?.name,
            },
            {
              title: 'Category',
              render: (_: unknown, r: { accessory?: { category?: string } }) =>
                r.accessory?.category,
            },
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
            {
              title: 'Item',
              render: (_: unknown, r: { consumable?: { name?: string } }) => r.consumable?.name,
            },
            {
              title: 'Category',
              render: (_: unknown, r: { consumable?: { category?: string } }) =>
                r.consumable?.category,
            },
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

  const historyKinds = Array.from(new Set(history.map((h) => h.kind))).sort();

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
        {
          title: 'Type',
          dataIndex: 'kind',
          defaultWidth: 180,
          filters: historyKinds.map((k) => ({ text: k, value: k })),
          onFilter: (value, r) => r.kind === value,
          sorter: (a, b) => a.kind.localeCompare(b.kind),
        },
        {
          title: 'Summary',
          dataIndex: 'summary',
          defaultWidth: 320,
          ellipsis: true,
          render: (_, r) => (r.href ? <Link to={r.href}>{r.summary}</Link> : r.summary),
        },
        {
          title: 'Detail',
          dataIndex: 'detail',
          defaultWidth: 260,
          ellipsis: true,
          render: (v) => v ?? '—',
        },
      ]}
    />
  );

  if (query.isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="Employee not found or you do not have access to this profile."
        action={
          <Link to="/employees">
            <Button size="small">Back to employees</Button>
          </Link>
        }
      />
    );
  }

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
                {emp?.employeeCode ? (
                  <CopyButton value={emp.employeeCode} label="employee code" />
                ) : null}
                · {emp?.designation ?? '—'} · {emp?.location?.name}
              </Space>
            </Typography.Text>
          </Col>
          <Col>
            <Space>
              {emp?.email ? (
                <Button href={`mailto:${emp.email}`}>Email</Button>
              ) : null}
              {canOffboard && emp?.isActive !== false && (
                <Button
                  type="primary"
                  onClick={() =>
                    navigate(
                      `/assets?filters[0][field]=status&filters[0][operator]=eq&filters[0][value]=available`,
                    )
                  }
                >
                  Assign asset
                </Button>
              )}
              <Statistic
                title="Assigned assets"
                value={assets.length}
                prefix={<LaptopOutlined />}
              />
              {canOffboard && emp && emp.isActive !== false && (
                <Button danger icon={<LogoutOutlined />} onClick={() => setOffboardOpen(true)}>
                  Offboard
                </Button>
              )}
              {canOffboard && emp && emp.isActive === false && (
                <Popconfirm
                  title="Reinstate this employee?"
                  description="They become active again and their login is re-enabled. No assets are re-assigned automatically."
                  okText="Reinstate"
                  onConfirm={() => void runReinstate()}
                >
                  <Button icon={<UndoOutlined />} loading={reinstating}>
                    Reinstate
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      <Card size="small">
        <Tabs
          items={[
            {
              key: 'assets',
              label: 'Assigned assets',
              children: (
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
                      render: (_: unknown, r: { category?: { name?: string } }) =>
                        r.category?.name ?? '—',
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
              ),
            },
            {
              key: 'supplies',
              label: 'Accessories & consumables',
              children: overview,
            },
            { key: 'history', label: 'History', children: historyTab },
            {
              key: 'requests',
              label: 'Requests',
              children: (
                <DataGrid<HistoryEvent>
                  tableKey={`employee-${id}-requests`}
                  rowKey="id"
                  dataSource={history.filter((h) => /request/i.test(h.kind))}
                  density={density}
                  columns={[
                    {
                      title: 'When',
                      dataIndex: 'at',
                      render: (v) => new Date(v).toLocaleString(),
                    },
                    { title: 'Type', dataIndex: 'kind' },
                    {
                      title: 'Summary',
                      dataIndex: 'summary',
                      render: (_, r) => (r.href ? <Link to={r.href}>{r.summary}</Link> : r.summary),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={offboardOpen}
        title={`Offboard ${emp?.firstName ?? ''} ${emp?.lastName ?? ''}`}
        okText="Offboard employee"
        okButtonProps={{ danger: true, loading: offboarding }}
        onCancel={() => setOffboardOpen(false)}
        onOk={() => void runOffboard()}
      >
        <Typography.Paragraph type="secondary">
          Returns assigned assets to the available pool (or reassigns them), checks in open
          accessories, deactivates the login account, and preserves all historical records.
        </Typography.Paragraph>
        <Form layout="vertical">
          <Form.Item label="Reassign assets to (optional)">
            <EmployeeSelect
              value={reassignTo}
              onChange={setReassignTo}
              excludeId={Number(id)}
              placeholder="Leave blank to return to pool"
            />
          </Form.Item>
          <Form.Item label="Notes">
            <Input.TextArea
              rows={2}
              value={offboardNotes}
              onChange={(e) => setOffboardNotes(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
