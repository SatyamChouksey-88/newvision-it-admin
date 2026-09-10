import { UploadOutlined } from '@ant-design/icons';
import { App as AntdApp, Button, Select, Space, Table, Typography, Upload } from 'antd';
import { useCallback, useEffect, useState } from 'react';
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
      const { data } = await httpClient.get('/reconciliation', { params: { _start: 0, _end: 20 } });
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
            <Table
              size="small"
              style={{ flex: 1 }}
              title={() => 'Only in uploaded file'}
              pagination={{ pageSize: 8 }}
              rowKey="key"
              dataSource={latest.findings.inFileOnly}
              columns={[
                { title: 'Key', dataIndex: 'key' },
                { title: 'Label', dataIndex: 'label' },
              ]}
            />
            <Table
              size="small"
              style={{ flex: 1 }}
              title={() => 'Only in NewVision'}
              pagination={{ pageSize: 8 }}
              rowKey="key"
              dataSource={latest.findings.inSystemOnly}
              columns={[
                { title: 'Key', dataIndex: 'key' },
                { title: 'Label', dataIndex: 'label' },
              ]}
            />
          </Space>
        </Space>
      )}

      <Table<ReconciliationRun>
        size="small"
        rowKey="id"
        dataSource={runs}
        loading={loading}
        locale={{ emptyText: 'No reconciliation runs yet' }}
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
