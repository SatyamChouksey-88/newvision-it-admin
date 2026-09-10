import { App as AntdApp, Alert, Checkbox, Form, Input, Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import type { Department, Location } from '../../types';

export function CreateEmployeeModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.allSettled([
      httpClient.get('/locations', { params: { _start: 0, _end: 100 } }),
      httpClient.get('/departments', { params: { _start: 0, _end: 100 } }),
    ]).then(([loc, dep]) => {
      if (cancelled) return;
      if (loc.status === 'fulfilled') setLocations(loc.value.data.data ?? []);
      if (dep.status === 'fulfilled') setDepartments(dep.value.data.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const submit = async () => {
    let v: {
      employeeCode: string;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      designation?: string;
      locationId: number;
      departmentId?: number;
      createLogin?: boolean;
      loginRole?: string;
    };
    try {
      v = await form.validateFields();
    } catch {
      return;
    }
    setLoading(true);
    try {
      await httpClient.post('/employees', {
        ...v,
        phone: v.phone?.trim() || undefined,
        designation: v.designation?.trim() || undefined,
        createLogin: Boolean(v.createLogin),
        loginRole: v.createLogin ? (v.loginRole ?? 'EMPLOYEE') : undefined,
      });
      message.success('Employee created');
      form.resetFields();
      onDone();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not create employee'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Add employee"
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={() => void submit()}
      confirmLoading={loading}
      okText="Create"
      okButtonProps={{ disabled: locations.length === 0 }}
      destroyOnClose
    >
      {locations.length === 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Add a location first"
          description={
            <span>
              Employees must belong to a site.{' '}
              <Link to="/locations/create">Create a location</Link> then come back.
            </span>
          }
        />
      )}
      <Form form={form} layout="vertical">
        <Form.Item label="Employee code" name="employeeCode" rules={[{ required: true, min: 2 }]}>
          <Input placeholder="EMP-PUN-0001" />
        </Form.Item>
        <Form.Item label="First name" name="firstName" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Last name" name="lastName" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Location" name="locationId" rules={[{ required: true, message: 'Pick a location' }]}>
          <Select
            placeholder="Location"
            options={locations.map((l) => ({ label: `${l.name} (${l.code})`, value: l.id }))}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item label="Department" name="departmentId">
          <Select
            allowClear
            placeholder="Optional"
            options={departments.map((d) => ({ label: d.name, value: d.id }))}
          />
        </Form.Item>
        <Form.Item label="Employment type" name="employmentType" initialValue="permanent">
          <Select
            options={[
              { label: 'Permanent — Active', value: 'permanent' },
              { label: 'Contract — Contract Active', value: 'contract' },
            ]}
          />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(a, b) => a.employmentType !== b.employmentType}>
          {({ getFieldValue }) =>
            getFieldValue('employmentType') === 'contract' ? (
              <Form.Item label="Contract end date" name="contractEndDate">
                <Input type="date" />
              </Form.Item>
            ) : null
          }
        </Form.Item>
        <Form.Item label="Designation" name="designation">
          <Input placeholder="Optional" />
        </Form.Item>
        <Form.Item label="Phone" name="phone">
          <Input placeholder="Optional" />
        </Form.Item>
        <Form.Item name="createLogin" valuePropName="checked">
          <Checkbox>Create a login for this employee</Checkbox>
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(a, b) => a.createLogin !== b.createLogin}>
          {({ getFieldValue }) =>
            getFieldValue('createLogin') ? (
              <Form.Item name="loginRole" label="Login role" initialValue="EMPLOYEE">
                <Select
                  options={[
                    { label: 'Employee', value: 'EMPLOYEE' },
                    { label: 'Manager', value: 'MANAGER' },
                    { label: 'IT Support', value: 'IT_SUPPORT' },
                    { label: 'IT Admin', value: 'IT_ADMIN' },
                  ]}
                />
              </Form.Item>
            ) : null
          }
        </Form.Item>
      </Form>
    </Modal>
  );
}
