import { App as AntdApp, Checkbox, Form, Input, Modal, Select, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { EmployeeSelect } from '../../components/EmployeeSelect';
import { httpClient } from '../../providers/axios';
import type { Accessory, Asset, Location } from '../../types';

export function AssignModal({
  asset,
  onClose,
  onDone,
}: {
  asset: Asset | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { message } = AntdApp.useApp();
  const [employeeId, setEmployeeId] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [accessoryIds, setAccessoryIds] = useState<number[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!asset) return;
    httpClient
      .get('/accessories', { params: { _start: 0, _end: 100 } })
      .then(({ data }) => setAccessories((data.data ?? []).filter((a: Accessory) => a.quantityAvailable > 0)));
  }, [asset]);

  const submit = async () => {
    if (!asset || !employeeId) {
      message.warning('Pick an employee');
      return;
    }
    setLoading(true);
    try {
      await httpClient.post(`/assets/${asset.id}/assign`, {
        employeeId,
        notes,
        accessoryIds: accessoryIds.length ? accessoryIds : undefined,
      });
      message.success(`Assigned ${asset.assetCode}`);
      setEmployeeId(undefined);
      setNotes('');
      onDone();
    } catch {
      message.error('Assignment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={!!asset}
      title={`Assign ${asset?.assetCode ?? ''}`}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={loading}
      okText="Assign"
    >
      <Form layout="vertical">
        <Form.Item label="Employee" required>
          <EmployeeSelect value={employeeId} onChange={setEmployeeId} />
        </Form.Item>
        <Form.Item label="Notes">
          <Input.TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Form.Item>
        {accessories.length > 0 && (
          <Form.Item label="Also issue accessories (optional)">
            <Checkbox.Group
              value={accessoryIds}
              onChange={(v) => setAccessoryIds(v as number[])}
              style={{ width: '100%' }}
            >
              <Space direction="vertical">
                {accessories.slice(0, 8).map((a) => (
                  <Checkbox key={a.id} value={a.id}>
                    {a.name}{' '}
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      ({a.quantityAvailable} available)
                    </Typography.Text>
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}

export function TransferModal({
  asset,
  locations,
  onClose,
  onDone,
}: {
  asset: Asset | null;
  locations: Location[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { message } = AntdApp.useApp();
  const [toEmployeeId, setToEmployeeId] = useState<number | undefined>();
  const [toLocationId, setToLocationId] = useState<number | undefined>();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!asset || (!toEmployeeId && !toLocationId)) {
      message.warning('Choose a target employee and/or location');
      return;
    }
    setLoading(true);
    try {
      await httpClient.post(`/assets/${asset.id}/transfer`, {
        toEmployeeId,
        toLocationId,
        reason,
      });
      message.success(`Transferred ${asset.assetCode}`);
      setToEmployeeId(undefined);
      setToLocationId(undefined);
      setReason('');
      onDone();
    } catch {
      message.error('Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={!!asset}
      title={`Transfer ${asset?.assetCode ?? ''}`}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={loading}
      okText="Transfer"
    >
      <Form layout="vertical">
        <Form.Item label="To employee">
          <EmployeeSelect value={toEmployeeId} onChange={setToEmployeeId} />
        </Form.Item>
        <Form.Item label="To location">
          <Select
            allowClear
            value={toLocationId}
            onChange={setToLocationId}
            options={locations.map((l) => ({ label: `${l.name} (${l.code})`, value: l.id }))}
            placeholder="Keep current location"
          />
        </Form.Item>
        <Form.Item label="Reason">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
