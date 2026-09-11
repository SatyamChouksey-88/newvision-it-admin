import { Button, Card, Descriptions, Space, Tag } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { EventTimeline, type TimelineEvent } from '../../../components/EventTimeline';
import { useToast } from '../../../components/Toast';
import { apiErrorMessage, httpClient } from '../../../providers/axios';

export function ContractShow() {
  const { id } = useParams();
  const toast = useToast();
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<TimelineEvent[]>([]);

  const load = useCallback(() => {
    if (!id) return;
    httpClient.get(`/vendor-contracts/${id}`).then(({ data }) => setRow(data));
    httpClient
      .get(`/vendor-contracts/${id}/history`)
      .then(({ data }) =>
        setHistory(
          (data ?? []).map(
            (h: {
              id: number;
              createdAt: string;
              summary: string;
              actor?: { fullName: string };
            }) => ({
              id: h.id,
              at: h.createdAt,
              summary: h.summary,
              actor: h.actor?.fullName,
            }),
          ),
        ),
      )
      .catch(() => setHistory([]));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const usage = Number(row?.usageCount ?? 0);
  const entitlement = Number(row?.entitlementCount ?? 0);
  const over = entitlement > 0 && usage / entitlement >= 0.9;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title={`${String((row?.vendor as { legalName?: string })?.legalName ?? 'Contract')} · ${String(row?.type ?? '')}`}
        extra={
          <Button
            onClick={async () => {
              try {
                const { data } = await httpClient.post(`/vendor-contracts/${id}/renew`);
                toast.success(`Renewed as contract #${data.id}`);
              } catch (e) {
                toast.error(apiErrorMessage(e, 'Could not renew'));
              }
            }}
          >
            Renew / clone term
          </Button>
        }
      >
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Start">
            {String(row?.startDate ?? '').slice(0, 10)}
          </Descriptions.Item>
          <Descriptions.Item label="End">
            {String(row?.endDate ?? '').slice(0, 10)}
          </Descriptions.Item>
          <Descriptions.Item label="Value">
            ₹{Number(row?.value ?? 0).toLocaleString('en-IN')}
          </Descriptions.Item>
          <Descriptions.Item label="Entitlement">
            {entitlement ? (
              <span>
                {usage} / {entitlement}
                {over ? (
                  <Tag color="orange" style={{ marginLeft: 8 }}>
                    Near/over contracted
                  </Tag>
                ) : null}
              </span>
            ) : (
              '—'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="SLA" span={2}>
            {String(row?.slaTerms ?? '—')}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title="Edit history">
        <EventTimeline events={history} />
      </Card>
    </Space>
  );
}
