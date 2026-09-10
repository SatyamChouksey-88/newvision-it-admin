import { UploadOutlined } from '@ant-design/icons';
import { App as AntdApp, Button, Select, Space, Typography, Upload } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { DataGrid } from '../../components/DataGrid/DataGrid';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import type { ReconciliationRun } from '../../types';

export function ReconciliationPanel() {
  const { message } = AntdApp.useApp();
  const [runs, setRuns] = useState<ReconciliationRun[]>([]);
  const [kind, setKind] = useState<'employees' | 'assets'>('employees');
  const [matchField, setMatchField] = useState('employeeCode');
  const [latest, setLatest] = useState<ReconciliationRun | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await httpClient.get('/reconciliation', { params: { _start: 0, _end: 100 } });
      setRuns(data.data ?? []);
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not load reconciliation runs'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    setMatchField(kind === 'employees' ? 'employeeCode' : 'assetCode');
  }, [kind]);

  const upload = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    setUploading(true);
    try {
      const { data } = await httpClient.post(
        `/reconciliation?kind=${kind}&matchField=${matchField}`,
        form,
      );
      setLatest(data);
      message.success(
        `Matched ${data.matched} · only in file ${data.inFileOnly} · only in system ${data.inSystemOnly}`,
      );
      void reload();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Reconciliation failed'));
    } finally {
      setUploading(false);
    }
    return false;
  };

  const matchOptions =
    kind === 'employees'
      ? [
          { label: 'Employee code', value: 'employeeCode' },
          { label: 'Email', value: 'email' },
        ]
      : [
          { label: 'Asset code', value: 'assetCode' },
          { label: 'Serial number', value: 'serialNumber' },
        ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Upload an HR (or inventory) CSV. Rows present in one side but not the other are flagged.
        Manual upload only — no live directory sync.
      </Typography.Paragraph>
      <Space wrap>
        <Select
          value={kind}
          onChange={setKind}
          style={{ width: 160 }}
          options={[
            { label: 'Employees (HR)', value: 'employees' },
            { label: 'Assets', value: 'assets' },
          ]}
        />
        <Select
          value={matchField}
          onChange={setMatchField}
          style={{ width: 180 }}
          options={matchOptions}
        />
        <Upload
          showUploadList={false}
          accept=".csv,.xlsx"
          beforeUpload={upload}
          disabled={uploading}
        >
          <Button icon={<UploadOutlined />} loading={uploading}>
            Upload export
          </Button>
        </Upload>
      </Space>

      {latest && (
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Typography.Text strong>
            Last run: {latest.matched} matched · {latest.inFileOnly} only in file ·{' '}
            {latest.inSystemOnly} only in system
          </Typography.Text>
          <Space align="start" style={{ width: '100%' }} size={16}>
            <div style={{ flex: 1 }}>
              <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                Only in uploaded file
              </Typography.Text>
              <DataGrid
                tableKey="recon-file-only"
                rowKey="key"
                dataSource={latest.findings.inFileOnly}
                density="Compact"
                pagination={{ pageSize: 8, size: 'small' }}
                columns={[
                  { title: 'Key', dataIndex: 'key' },
                  { title: 'Label', dataIndex: 'label' },
                ]}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                Only in NewVision
              </Typography.Text>
              <DataGrid
                tableKey="recon-system-only"
                rowKey="key"
                dataSource={latest.findings.inSystemOnly}
                density="Compact"
                pagination={{ pageSize: 8, size: 'small' }}
                columns={[
                  { title: 'Key', dataIndex: 'key' },
                  { title: 'Label', dataIndex: 'label' },
                ]}
              />
            </div>
          </Space>
        </Space>
      )}

      <DataGrid<ReconciliationRun>
        tableKey="reconciliation-runs"
        rowKey="id"
        dataSource={runs}
        loading={loading}
        density="Compact"
        rowClassName={(r) => (r.id === latest?.id ? 'ant-table-row-selected' : '')}
        onRow={(r) => ({ onClick: () => setLatest(r), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: 'File', dataIndex: 'filename' },
          { title: 'Kind', dataIndex: 'kind' },
          { title: 'Match', dataIndex: 'matchField' },
          { title: 'Matched', dataIndex: 'matched' },
          { title: 'In file only', dataIndex: 'inFileOnly' },
          { title: 'In system only', dataIndex: 'inSystemOnly' },
        ]}
      />
    </Space>
  );
}
