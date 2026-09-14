import { Button, Card, Descriptions, Form, Input, Select, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { StatusTag } from '../components/StatusTag';
import { API_URL } from '../providers/axios';
import { readSession, TOKEN_KEY, USER_KEY } from '../providers/session';
import { COLOR_TEXT_MUTED } from '../theme';
import type { AssetStatus } from '../types';

interface ScanCard {
  assetCode: string;
  brand?: string | null;
  model?: string | null;
  status: AssetStatus;
  location?: string;
  locationCode?: string;
  locationId?: number;
  category?: string;
  assigned?: boolean;
  tenantSlug?: string;
}

function staffFromSession(): boolean {
  const raw = readSession(USER_KEY);
  if (!raw) return false;
  try {
    const role = (JSON.parse(raw) as { role?: string }).role;
    return role === 'SUPER_ADMIN' || role === 'IT_ADMIN' || role === 'IT_SUPPORT';
  } catch {
    return false;
  }
}

/** Public, mobile-first asset card opened by scanning a sticker QR. Audit now requires a staff login. */
export function ScanPage() {
  const { code, slug } = useParams();
  const [card, setCard] = useState<ScanCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audited, setAudited] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [locations, setLocations] = useState<{ id: number; name: string; code?: string }[]>([]);
  const token = readSession(TOKEN_KEY);
  const staff = Boolean(token) && staffFromSession();

  useEffect(() => {
    if (!code) return;
    const path = slug
      ? `${API_URL}/public/assets/t/${encodeURIComponent(slug)}/${encodeURIComponent(code)}`
      : `${API_URL}/public/assets/${encodeURIComponent(code)}`;
    fetch(path)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Asset not found' : 'Could not load asset');
        return res.json();
      })
      .then(setCard)
      .catch((e) => setError((e as Error).message));
  }, [code, slug]);

  useEffect(() => {
    if (!staff || !token) return;
    fetch(`${API_URL}/locations?_start=0&_end=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => (res.ok ? res.json() : { data: [] }))
      .then((body: { data?: { id: number; name: string; code?: string }[] }) =>
        setLocations(body.data ?? []),
      )
      .catch(() => setLocations([]));
  }, [staff, token]);

  const auditNow = async (values: { notes?: string; locationId?: number }) => {
    if (!token || !card) return;
    setBusy(true);
    setAudited(null);
    try {
      const locationId = values.locationId ? Number(values.locationId) : undefined;
      const res = await fetch(`${API_URL}/assets/audit-by-code`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: card.assetCode,
          notes: values.notes?.trim() || undefined,
          locationId,
        }),
      });
      if (res.status === 401 || res.status === 403) {
        throw new Error('Sign in as IT staff to stamp an audit from this phone.');
      }
      if (!res.ok) throw new Error('Could not stamp audit');
      setAudited(`Audited ${new Date().toLocaleString()}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="nv-scan-page">
      <Space direction="vertical" size={16} style={{ width: '100%', maxWidth: 420 }}>
        <div>
          <Typography.Text style={{ fontSize: 12, color: COLOR_TEXT_MUTED }}>
            NewVision IT · Physical audit
          </Typography.Text>
          <Typography.Title level={3} style={{ margin: '4px 0 0', fontSize: 22, letterSpacing: '-0.02em' }}>
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
              <Descriptions.Item label="Category">{card.category ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Location">
                {card.location ?? card.locationCode ?? '—'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}
        {card && staff ? (
          <Card size="small" title="Audit now" data-testid="scan-audit">
            <Form
              layout="vertical"
              onFinish={(v) => void auditNow(v)}
              initialValues={{ locationId: card.locationId }}
            >
              <Form.Item
                name="locationId"
                label="Confirm location"
                extra="Change this if the sticker is on a desk in a different office."
              >
                <Select
                  data-testid="scan-location"
                  placeholder="This office"
                  options={locations.map((l) => ({
                    value: l.id,
                    label: l.code ? `${l.name} (${l.code})` : l.name,
                  }))}
                />
              </Form.Item>
              <Form.Item name="notes" label="Condition note (optional)">
                <Input.TextArea rows={2} maxLength={240} />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={busy} block>
                Stamp last audited today
              </Button>
              {audited ? (
                <Typography.Text
                  type="success"
                  data-testid="scan-audited"
                  style={{ display: 'block', marginTop: 8 }}
                >
                  {audited}
                </Typography.Text>
              ) : null}
            </Form>
          </Card>
        ) : card ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            <a href={`/login?to=/scan/${encodeURIComponent(card.assetCode)}`}>Sign in as IT staff</a>
            {' '}to stamp “Audit now”.
          </Typography.Text>
        ) : null}
      </Space>
    </div>
  );
}
