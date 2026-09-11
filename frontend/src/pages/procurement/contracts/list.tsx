import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { PrimaryWithSub } from '../../../components/Cells';
import { DataGrid, type TableDensity } from '../../../components/DataGrid/DataGrid';
import { EmptyState } from '../../../components/EmptyState';
import { TablePagination } from '../../../components/TablePagination';
import { TableSkeleton } from '../../../components/TableSkeleton';
import { useToast } from '../../../components/Toast';
import { apiErrorMessage, httpClient } from '../../../providers/axios';

interface ContractRow {
  id: number;
  type: string;
  startDate: string;
  endDate: string;
  value: number;
  entitlementCount?: number | null;
  usageCount?: number | null;
  vendor?: { legalName: string };
}

export function ContractList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [vendors, setVendors] = useState<{ id: number; legalName: string }[]>([]);
  const [form] = Form.useForm();
  const [density, setDensity] = useState<TableDensity>('Compact');

  useEffect(() => {
    setLoading(true);
    httpClient
      .get('/vendor-contracts', { params: { _start: (page - 1) * 25, _end: page * 25 } })
      .then(({ data }) => {
        setRows(data.data ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    httpClient
      .get('/vendors', { params: { _start: 0, _end: 200 } })
      .then(({ data }) => setVendors(data.data ?? []));
  }, []);

  return (
    <Card
      title="Contracts & SLAs"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          New contract
        </Button>
      }
    >
      {loading ? (
        <TableSkeleton columns={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          description="No contracts yet."
          actionLabel="New contract"
          onAction={() => setOpen(true)}
        />
      ) : (
        <>
          <DataGrid<ContractRow>
            tableKey="vendor-contracts"
            dataSource={rows}
            rowKey="id"
            density={density}
            onDensityChange={setDensity}
            onRow={(r) => ({ onClick: () => navigate(`/procurement/contracts/show/${r.id}`) })}
            columns={[
              {
                title: 'Vendor',
                render: (_, r) => (
                  <PrimaryWithSub
                    primary={r.vendor?.legalName ?? '—'}
                    sub={r.type.replace('_', ' ')}
                  />
                ),
              },
              { title: 'End', dataIndex: 'endDate', render: (v: string) => v?.slice(0, 10) },
              {
                title: 'Value',
                dataIndex: 'value',
                render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}`,
              },
              {
                title: 'Entitlement',
                render: (_, r) =>
                  r.entitlementCount != null ? `${r.usageCount ?? 0} / ${r.entitlementCount}` : '—',
              },
            ]}
          />
          <TablePagination page={page} pageSize={25} total={total} onChange={setPage} />
        </>
      )}
      <Modal
        title="New contract"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() =>
          form.validateFields().then(async (v) => {
            try {
              const { data } = await httpClient.post('/vendor-contracts', {
                ...v,
                startDate: dayjs(v.startDate).toISOString(),
                endDate: dayjs(v.endDate).toISOString(),
              });
              setOpen(false);
              navigate(`/procurement/contracts/show/${data.id}`);
            } catch (e) {
              toast.error(apiErrorMessage(e, 'Could not create contract'));
            }
          })
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="vendorId" label="Vendor" rules={[{ required: true }]}>
            <Select options={vendors.map((v) => ({ value: v.id, label: v.legalName }))} />
          </Form.Item>
          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true }]}
            initialValue="license_subscription"
          >
            <Select
              options={['warranty', 'amc', 'sla', 'license_subscription'].map((t) => ({
                value: t,
                label: t,
              }))}
            />
          </Form.Item>
          <Form.Item name="startDate" label="Start" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="endDate" label="End" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="value" label="Value" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="entitlementCount" label="Entitlement (seats)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="slaTerms" label="SLA terms">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
