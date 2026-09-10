import { App as AntdApp, Modal, Select, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import type { Asset } from '../../types';

/** Issue an available asset to this employee from their profile. */
export function AssignToEmployeeModal({
  employeeId,
  employeeLabel,
  open,
  onClose,
  onDone,
}: {
  employeeId: number;
  employeeLabel: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { message } = AntdApp.useApp();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetId, setAssetId] = useState<number>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    httpClient
      .get('/assets', { params: { _start: 0, _end: 80, status: 'available' } })
      .then(({ data }) => {
        if (!cancelled) setAssets(data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setAssets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const submit = async () => {
    if (!assetId) {
      message.warning('Pick an available asset');
      return;
    }
    setLoading(true);
    try {
      await httpClient.post(`/assets/${assetId}/assign`, { employeeId });
      message.success(`Assigned to ${employeeLabel}`);
      setAssetId(undefined);
      onDone();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Assignment failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`Assign asset to ${employeeLabel}`}
      onCancel={onClose}
      onOk={() => void submit()}
      confirmLoading={loading}
      okText="Assign"
      okButtonProps={{ disabled: !assetId }}
    >
      <Typography.Paragraph type="secondary">
        Only assets currently marked Available are listed. Search by code, brand, or model.
      </Typography.Paragraph>
      <Select
        showSearch
        allowClear
        style={{ width: '100%' }}
        placeholder="Search available assets"
        aria-label="Available asset"
        value={assetId}
        onChange={(v) => setAssetId(v)}
        optionFilterProp="label"
        options={assets.map((a) => ({
          value: a.id,
          label: `${a.assetCode} · ${[a.brand, a.model].filter(Boolean).join(' ') || a.category?.name || 'Asset'}`,
        }))}
      />
    </Modal>
  );
}
