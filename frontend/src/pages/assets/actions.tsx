import { App as AntdApp, Checkbox, Form, Input, Modal, Select, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { EmployeeSelect } from '../../components/EmployeeSelect';
import { apiErrorMessage, httpClient } from '../../providers/axios';
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
    let cancelled = false;
    httpClient
      .get('/accessories', { params: { _start: 0, _end: 100 } })
      .then(({ data }) => {
        if (cancelled) return;
        setAccessories((data.data ?? []).filter((a: Accessory) => a.quantityAvailable > 0));
      })
      .catch(() => {
        // Optional extra; the assignment itself still works without the accessory list.
        if (!cancelled) setAccessories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [asset]);

  const reset = () => {
    setEmployeeId(undefined);
    setNotes('');
    setAccessoryIds([]);
  };

  const submit = async () => {
    if (!asset || !employeeId) {
      message.warning('Pick an employee');
      return;
    }
    setLoading(true);
    try {
      await httpClient.post(`/assets/${asset.id}/assign`, {
        employeeId,
        notes: notes.trim() || undefined,
        accessoryIds: accessoryIds.length ? accessoryIds : undefined,
      });
      message.success(`Assigned ${asset.assetCode}`);
      reset();
      onDone();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Assignment failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={!!asset}
      title={`Assign ${asset?.assetCode ?? ''}`}
      onCancel={() => {
        reset();
        onClose();
      }}
      onOk={submit}
      confirmLoading={loading}
      okText="Assign"
      okButtonProps={{ disabled: !employeeId }}
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

  const reset = () => {
    setToEmployeeId(undefined);
    setToLocationId(undefined);
    setReason('');
  };

  const sameEmployee = !!toEmployeeId && toEmployeeId === asset?.assignedEmployeeId;
  const sameLocation = !!toLocationId && toLocationId === asset?.locationId;
  const nothingChanges = (!toEmployeeId || sameEmployee) && (!toLocationId || sameLocation);

  const submit = async () => {
    if (!asset || nothingChanges) {
      message.warning('Choose a different employee and/or location');
      return;
    }
    setLoading(true);
    try {
      await httpClient.post(`/assets/${asset.id}/transfer`, {
        toEmployeeId: sameEmployee ? undefined : toEmployeeId,
        toLocationId: sameLocation ? undefined : toLocationId,
        reason: reason.trim() || undefined,
      });
      message.success(`Transferred ${asset.assetCode}`);
      reset();
      onDone();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Transfer failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={!!asset}
      title={`Transfer ${asset?.assetCode ?? ''}`}
      onCancel={() => {
        reset();
        onClose();
      }}
      onOk={submit}
      confirmLoading={loading}
      okText="Transfer"
      okButtonProps={{ disabled: nothingChanges }}
    >
      <Form layout="vertical">
        <Form.Item
          label="To employee"
          validateStatus={sameEmployee ? 'warning' : undefined}
          help={sameEmployee ? 'Already assigned to this employee' : undefined}
        >
          <EmployeeSelect
            value={toEmployeeId}
            onChange={setToEmployeeId}
            excludeId={asset?.assignedEmployeeId ?? undefined}
            placeholder={
              asset?.assignedEmployeeId ? 'Keep current holder' : 'Assign to an employee'
            }
          />
        </Form.Item>
        <Form.Item
          label="To location"
          extra={
            asset?.location
              ? `Currently at ${asset.location.name} (${asset.location.code})`
              : undefined
          }
          validateStatus={sameLocation ? 'warning' : undefined}
          help={sameLocation ? 'Already at this location' : undefined}
        >
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            value={toLocationId}
            onChange={setToLocationId}
            // The current site is not a valid target, so leave it out of the list.
            options={locations
              .filter((l) => l.id !== asset?.locationId)
              .map((l) => ({ label: `${l.name} (${l.code})`, value: l.id }))}
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
