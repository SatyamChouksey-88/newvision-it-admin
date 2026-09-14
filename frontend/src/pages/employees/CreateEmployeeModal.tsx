import { App as AntdApp, Alert, Checkbox, DatePicker, Form, Input, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { EmployeeSelect } from '../../components/EmployeeSelect';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import type { Department, Location } from '../../types';

const dateJoinedProps = {
  getValueProps: (v?: string) => ({ value: v ? dayjs(v) : undefined }),
  normalize: (v: dayjs.Dayjs | null) => (v ? v.startOf('day').toISOString() : undefined),
};

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
      if (loc.status === 'fulfilled') {
        const rows = loc.value.data.data ?? [];
        setLocations(rows);
        try {
          const last = Number(localStorage.getItem('nv.employees.lastLocationId') ?? '');
          if (last && rows.some((l: Location) => l.id === last)) {
            form.setFieldsValue({ locationId: last });
          }
        } catch {
          /* ignore */
        }
      }
      if (dep.status === 'fulfilled') setDepartments(dep.value.data.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [open, form.setFieldsValue]);

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
      managerId?: number;
      dateJoined: string;
      expectedStartDate?: string;
      probationEndDate?: string;
      deskOrSeat?: string;
      employmentType?: string;
      contractEndDate?: string;
      createLogin?: boolean;
      loginRole?: string;
      startOnboardChecklist?: boolean;
    };
    try {
      v = await form.validateFields();
    } catch {
      return;
    }
    setLoading(true);
    try {
      const { data } = await httpClient.post('/employees', {
        ...v,
        phone: v.phone?.trim() || undefined,
        designation: v.designation?.trim() || undefined,
        deskOrSeat: v.deskOrSeat?.trim() || undefined,
        createLogin: Boolean(v.createLogin),
        loginRole: v.createLogin ? (v.loginRole ?? 'EMPLOYEE') : undefined,
        startOnboardChecklist: v.startOnboardChecklist !== false,
      });
      try {
        localStorage.setItem('nv.employees.lastLocationId', String(v.locationId));
      } catch {
        /* ignore */
      }
      if (data?.duplicateNameJoinWarning) {
        message.warning(data.duplicateNameJoinWarning);
      }
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
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          dateJoined: dayjs().startOf('day').toISOString(),
          startOnboardChecklist: true,
          employmentType: 'permanent',
        }}
      >
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
        <Form.Item
          label="Date of joining"
          name="dateJoined"
          rules={[{ required: true, message: 'Joining date is required' }]}
          extra="Offer or actual start date — not when this row was typed."
          {...dateJoinedProps}
        >
          <DatePicker style={{ width: '100%' }} allowClear={false} />
        </Form.Item>
        <Form.Item
          label="Expected start"
          name="expectedStartDate"
          extra="Optional. Use when kit packing is before the offer date."
          {...dateJoinedProps}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label="Probation end"
          name="probationEndDate"
          extra="Leave blank for DOJ + 90 days (India typical)."
          {...dateJoinedProps}
        >
          <DatePicker style={{ width: '100%' }} />
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
        <Form.Item label="Reports to" name="managerId">
          <EmployeeSelect placeholder="Optional manager" />
        </Form.Item>
        <Form.Item label="Desk / seat" name="deskOrSeat">
          <Input placeholder="Pune 4th, bay 12" />
        </Form.Item>
        <Form.Item label="Employment type" name="employmentType">
          <Select
            options={[
              { label: 'Permanent — Active', value: 'permanent' },
              { label: 'Contract — Contract Active', value: 'contract' },
              { label: 'Intern', value: 'intern' },
              { label: 'Consultant', value: 'consultant' },
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
        <Form.Item label="Phone" name="phone" extra="India numbers: +91 …">
          <Input placeholder="+91" />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(a, b) => a.dateJoined !== b.dateJoined}>
          {({ getFieldValue }) => {
            const doj = getFieldValue('dateJoined');
            const future = doj && dayjs(doj).isAfter(dayjs(), 'day');
            return (
              <Form.Item name="startOnboardChecklist" valuePropName="checked">
                <Checkbox disabled={future}>
                  {future
                    ? 'Onboard checklist starts on joining day (future DOJ)'
                    : 'Start onboard checklist'}
                </Checkbox>
              </Form.Item>
            );
          }}
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
