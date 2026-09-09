import { Card, Descriptions, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { StatusTag } from '../components/StatusTag';
import { WarrantyDays } from '../components/Cells';
import { API_URL } from '../providers/axios';
import type { AssetStatus } from '../types';

interface ScanCard {
  assetCode: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  status: AssetStatus;
  condition?: string;
  location?: string;
  locationCode?: string;
  category?: string;
  assignedTo?: string | null;
  warrantyEnd?: string | null;
}

/** Public, mobile-first asset card opened by scanning a sticker QR. No login. */
export function ScanPage() {
  const { code } = useParams();
  const [card, setCard] = useState<ScanCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    fetch(`${API_URL}/public/assets/${encodeURIComponent(code)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Asset not found' : 'Could not load asset');
        return res.json();
      })
      .then(setCard)
      .catch((e) => setError((e as Error).message));
  }, [code]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f6f8',
        padding: '24px 16px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Space direction="vertical" size={16} style={{ width: '100%', maxWidth: 420 }}>
        <div>
          <Typography.Text type="secondary">NewVision IT · Physical audit</Typography.Text>
          <Typography.Title level={3} style={{ margin: '4px 0 0' }}>
            {card?.assetCode ?? code ?? 'Asset'}
          </Typography.Title>
        </div>
        {error && (
          <Card size="small">
            <Typography.Text type="danger">{error}</Typography.Text>
          </Card>
        )}
        {card && (
          <Card size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Status">
                <StatusTag status={card.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Item">
                {`${card.brand ?? ''} ${card.model ?? ''}`.trim() || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Serial">{card.serialNumber ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Category">{card.category ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Location">
                {card.location ?? card.locationCode ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Assigned to">{card.assignedTo ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Warranty">
                <WarrantyDays warrantyEnd={card.warrantyEnd ?? undefined} />
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}
      </Space>
    </div>
  );
}
