import { UploadOutlined } from '@ant-design/icons';
import {
  App as AntdApp,
  Button,
  Descriptions,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { CopyButton } from '../../components/CopyButton';
import { ImportResultChart } from '../../components/charts/ImportResultChart';
import { DataGrid, type TableDensity } from '../../components/DataGrid/DataGrid';
import { TablePagination } from '../../components/TablePagination';
import { useToast } from '../../components/Toast';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import type { ImportJob } from '../../types';
import { formatDate, formatDuration } from '../../utils/format';

const STATUS_COLOR: Record<ImportJob['status'], string> = {
  queued: 'default',
  previewed: 'blue',
  running: 'gold',
  completed: 'green',
  failed: 'red',
  rolled_back: 'default',
};

export function ImportJobsPanel() {
  const { message } = AntdApp.useApp();
  const toast = useToast();
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [kind, setKind] = useState<'assets' | 'employees'>('assets');
  const [active, setActive] = useState<ImportJob | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [density, setDensity] = useState<TableDensity>('Compact');

  const [loadingJobs, setLoadingJobs] = useState(false);

  const reload = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const { data } = await httpClient.get('/import-jobs', { params: { _start: 0, _end: 200 } });
      setJobs(data.data ?? []);
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not load import jobs'));
    } finally {
      setLoadingJobs(false);
    }
  }, [message]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openJob = (job: ImportJob) => {
    setActive(job);
    setMapping(job.mapping ?? job.preview?.suggestedMapping ?? {});
  };

  const upload = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    setBusy(true);
    try {
      const { data } = await httpClient.post(`/import-jobs?kind=${kind}`, form);
      message.success('File uploaded — review column mapping');
      openJob(data);
      void reload();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Upload failed'));
    } finally {
      setBusy(false);
    }
    return false;
  };

  const preview = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const { data } = await httpClient.post(`/import-jobs/${active.id}/preview`, { mapping });
      setActive(data);
      message.success(
        `Dry-run: ${data.duplicateCount ?? 0} duplicate(s) flagged of ${data.totalRows} rows`,
      );
      void reload();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Preview failed'));
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await httpClient.post(`/import-jobs/${active.id}/commit`, { mapping });
      for (let i = 0; i < 40; i++) {
        const { data } = await httpClient.get(`/import-jobs/${active.id}`);
        setActive(data);
        if (data.status === 'completed' || data.status === 'failed') {
          const dur = formatDuration(data.startedAt, data.finishedAt);
          if (data.status === 'completed') {
            toast.success(
              `Import done in ${dur}: ${data.createdCount} created, ${data.updatedCount ?? 0} updated, ${data.failedCount} failed`,
            );
          } else {
            toast.error(`Import failed after ${dur}`);
          }
          void reload();
          return;
        }
        // Back off gradually: 400ms → 2s so long imports don't hammer the API.
        await new Promise((r) => setTimeout(r, Math.min(2000, 400 + i * 100)));
      }
      message.info('Import is still running — refresh the jobs list shortly');
      void reload();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Commit failed'));
    } finally {
      setBusy(false);
    }
  };

  const rollback = async (id: number) => {
    try {
      await httpClient.post(`/import-jobs/${id}/rollback`);
      message.success('Rolled back');
      if (active?.id === id) setActive(null);
      void reload();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Rollback failed'));
    }
  };

  const headers = active?.preview?.headers ?? Object.keys(mapping);
  const canonical = active?.preview?.canonical ?? [];
  const fieldOptions = [
    { label: '(ignore)', value: '' },
    ...canonical.map((c) => ({ label: c, value: c })),
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space wrap>
        <Select
          value={kind}
          onChange={setKind}
          style={{ width: 160 }}
          options={[
            { label: 'Assets', value: 'assets' },
            { label: 'Employees', value: 'employees' },
          ]}
        />
        <Upload showUploadList={false} accept=".csv,.xlsx" beforeUpload={upload} disabled={busy}>
          <Button icon={<UploadOutlined />} loading={busy}>
            Upload file
          </Button>
        </Upload>
        <Typography.Text type="secondary">
          Large Excel/CSV imports run in the background. Map columns, dry-run, then commit. Rollback
          undoes rows this job created.
        </Typography.Text>
      </Space>

      {active && (
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <Typography.Text strong>
            Job #{active.id} · {active.filename} ·{' '}
            <Tag color={STATUS_COLOR[active.status]}>{active.status}</Tag>
          </Typography.Text>
          <DataGrid
            tableKey="import-column-map"
            pagination={false}
            rowKey="header"
            dataSource={headers.map((h) => ({ header: h }))}
            density="Compact"
            quickFilter={false}
            columns={[
              { title: 'File column', dataIndex: 'header' },
              {
                title: 'Maps to',
                render: (_, r) => (
                  <Select
                    size="small"
                    style={{ width: 200 }}
                    value={mapping[r.header] ?? ''}
                    options={fieldOptions}
                    onChange={(v) => setMapping((m) => ({ ...m, [r.header]: v }))}
                  />
                ),
              },
            ]}
          />
          <Space>
            <Button onClick={preview} loading={busy}>
              Dry-run preview
            </Button>
            <Button
              type="primary"
              onClick={commit}
              loading={busy}
              disabled={
                active.status === 'completed' ||
                active.status === 'running' ||
                active.status === 'rolled_back'
              }
            >
              Commit import
            </Button>
            {active.status === 'completed' && (
              <Popconfirm
                title="Roll back this import?"
                description="Rows created by this job will be deleted."
                okText="Roll back"
                okButtonProps={{ danger: true }}
                onConfirm={() => rollback(active.id)}
              >
                <Button danger>Rollback</Button>
              </Popconfirm>
            )}
          </Space>
          {!!active.preview?.duplicates?.length && (
            <Typography.Text type="warning">
              {active.preview.duplicates.length} duplicate row(s) will be skipped (serial/email
              already exists in the file or in the system).
            </Typography.Text>
          )}
          {(active.status === 'completed' || active.status === 'failed') &&
            (active.createdCount > 0 ||
              active.failedCount > 0 ||
              (active.updatedCount ?? 0) > 0) && <ImportResultChart job={active} />}
          {!!active.errors?.length && (
            <DataGrid
              tableKey="import-errors"
              pagination={{ pageSize: 5, size: 'small' }}
              rowKey={(r) => `${r.row}-${r.message}`}
              dataSource={active.errors}
              density="Compact"
              columns={[
                { title: 'Row', dataIndex: 'row', width: 70 },
                { title: 'Error', dataIndex: 'message' },
              ]}
            />
          )}
        </Space>
      )}

      <DataGrid<ImportJob>
        tableKey="import-jobs"
        searchInputId="import-jobs-grid-search"
        rowKey="id"
        dataSource={jobs.slice((page - 1) * pageSize, page * pageSize)}
        loading={loadingJobs}
        density={density}
        onDensityChange={setDensity}
        fixFirstColumn
        expandable={{
          expandedRowKeys: expanded,
          onExpandedRowsChange: (keys) => setExpanded(keys as number[]),
          expandedRowRender: (r) => (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Descriptions size="small" column={2} bordered>
                <Descriptions.Item label="Started">{formatDate(r.startedAt)}</Descriptions.Item>
                <Descriptions.Item label="Completed">{formatDate(r.finishedAt)}</Descriptions.Item>
                <Descriptions.Item label="Duration">
                  {formatDuration(r.startedAt, r.finishedAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Rows processed">{r.totalRows}</Descriptions.Item>
                <Descriptions.Item label="Created">{r.createdCount}</Descriptions.Item>
                <Descriptions.Item label="Updated">{r.updatedCount ?? 0}</Descriptions.Item>
                <Descriptions.Item label="Failed">{r.failedCount}</Descriptions.Item>
                <Descriptions.Item label="Duplicates">{r.duplicateCount ?? 0}</Descriptions.Item>
              </Descriptions>
              {(r.status === 'completed' || r.status === 'failed') &&
                (r.createdCount > 0 || r.failedCount > 0 || (r.updatedCount ?? 0) > 0) && (
                  <ImportResultChart job={r} />
                )}
            </Space>
          ),
        }}
        onRow={(r) => ({ onClick: () => openJob(r) })}
        columns={[
          {
            title: 'ID',
            dataIndex: 'id',
            defaultWidth: 72,
            render: (v: number) => (
              <Space size={4}>
                {v}
                <CopyButton value={String(v)} label="job id" />
              </Space>
            ),
          },
          { title: 'File', dataIndex: 'filename' },
          { title: 'Kind', dataIndex: 'kind' },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (s: ImportJob['status'], r) => (
              <Space direction="vertical" size={0}>
                <Tag color={STATUS_COLOR[s]}>{s}</Tag>
                {s === 'failed' && r.errors?.[0]?.message ? (
                  <Typography.Text type="danger" style={{ fontSize: 11 }}>
                    {r.errors[0].message}
                  </Typography.Text>
                ) : null}
              </Space>
            ),
          },
          { title: 'Created', dataIndex: 'createdCount' },
          { title: 'Failed', dataIndex: 'failedCount' },
          {
            title: '',
            gridKey: 'actions',
            exportable: false,
            render: (_, r) =>
              r.status === 'completed' ? (
                <Popconfirm
                  title="Roll back this import?"
                  description="Rows created by this job will be deleted."
                  okText="Roll back"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => rollback(r.id)}
                  onPopupClick={(e) => e.stopPropagation()}
                >
                  <Button size="small" danger onClick={(e) => e.stopPropagation()}>
                    Rollback
                  </Button>
                </Popconfirm>
              ) : null,
          },
        ]}
      />
      <TablePagination
        total={jobs.length}
        page={page}
        pageSize={pageSize}
        onChange={(p, s) => {
          setPage(p);
          setPageSize(s);
        }}
      />
    </Space>
  );
}
