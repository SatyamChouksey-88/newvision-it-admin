import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Space, Tag, Tooltip } from 'antd';

const VENDOR: Record<string, { color: string; bg: string; label: string }> = {
  draft: { color: '#64748b', bg: '#f8fafc', label: 'Draft' },
  pending_approval: { color: '#b45309', bg: '#fffbeb', label: 'Pending approval' },
  active: { color: '#15803d', bg: '#f0fdf4', label: 'Active' },
  suspended: { color: '#b45309', bg: '#fff7ed', label: 'Suspended' },
  blacklisted: { color: '#b91c1c', bg: '#fef2f2', label: 'Blacklisted' },
};

const PR: Record<string, { color: string; bg: string; label: string }> = {
  draft: { color: '#64748b', bg: '#f8fafc', label: 'Draft' },
  pending_approval: { color: '#b45309', bg: '#fffbeb', label: 'Pending approval' },
  approved: { color: '#15803d', bg: '#f0fdf4', label: 'Approved' },
  rejected: { color: '#b91c1c', bg: '#fef2f2', label: 'Rejected' },
  converted_to_po: { color: '#1d4ed8', bg: '#eff6ff', label: 'Converted to PO' },
  cancelled: { color: '#64748b', bg: '#f1f5f9', label: 'Cancelled' },
};

const PO: Record<string, { color: string; bg: string; label: string }> = {
  draft: { color: '#64748b', bg: '#f8fafc', label: 'Draft' },
  sent: { color: '#1d4ed8', bg: '#eff6ff', label: 'Sent' },
  partially_received: { color: '#b45309', bg: '#fffbeb', label: 'Partially received' },
  received: { color: '#15803d', bg: '#f0fdf4', label: 'Received' },
  closed: { color: '#334155', bg: '#f8fafc', label: 'Closed' },
  cancelled: { color: '#64748b', bg: '#f1f5f9', label: 'Cancelled' },
};

function chip(map: Record<string, { color: string; bg: string; label: string }>, status?: string) {
  const s = map[status ?? ''] ?? { color: '#64748b', bg: '#f8fafc', label: status ?? '—' };
  return (
    <Tag style={{ color: s.color, background: s.bg, borderColor: s.bg, marginInlineEnd: 0 }}>
      {s.label}
    </Tag>
  );
}

export function VendorStatusTag({ status }: { status?: string }) {
  return chip(VENDOR, status);
}
export function PrStatusTag({ status }: { status?: string }) {
  return chip(PR, status);
}
export function PoStatusTag({ status }: { status?: string }) {
  return chip(PO, status);
}

export interface ApproverRow {
  id: number;
  kind: 'required' | 'watcher';
  status: 'pending' | 'approved' | 'rejected';
  level: number;
  comment?: string | null;
  user: { fullName: string; email?: string; role?: { name?: string } };
}

export function ApprovalChain({ approvers }: { approvers: ApproverRow[] }) {
  if (!approvers?.length) return <span style={{ color: '#64748b' }}>No approvers yet.</span>;
  return (
    <Space wrap size={8}>
      {approvers.map((a) => {
        const icon =
          a.status === 'approved' ? (
            <CheckCircleOutlined style={{ color: '#15803d' }} />
          ) : a.status === 'rejected' ? (
            <CloseCircleOutlined style={{ color: '#b91c1c' }} />
          ) : (
            <ClockCircleOutlined style={{ color: '#d97706' }} />
          );
        const label = a.kind === 'watcher' ? 'Cc' : 'To';
        return (
          <Tooltip key={a.id} title={`${label} · ${a.status}${a.comment ? ` · ${a.comment}` : ''}`}>
            <Tag icon={icon} style={{ padding: '2px 8px' }}>
              {a.user.fullName}
              <span style={{ marginLeft: 6, color: '#64748b', fontSize: 11 }}>{label}</span>
            </Tag>
          </Tooltip>
        );
      })}
    </Space>
  );
}
