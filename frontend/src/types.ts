export type AssetStatus =
  | 'available'
  | 'assigned'
  | 'under_repair'
  | 'lost'
  | 'damaged'
  | 'retired'
  | 'disposed'
  | 'pending_assignment';

export type AssetCondition = 'new' | 'good' | 'fair' | 'poor';

export interface Location {
  id: number;
  code: string;
  name: string;
  city: string;
  address?: string;
}

export interface Department {
  id: number;
  name: string;
  description?: string;
}

export interface AssetCategory {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  designation?: string;
  isActive?: boolean;
  locationId: number;
  departmentId?: number;
  location?: Location;
  department?: Department;
}

export interface Asset {
  id: number;
  assetCode: string;
  categoryId: number;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchaseCost?: string | number;
  warrantyStart?: string;
  warrantyEnd?: string;
  locationId: number;
  departmentId?: number;
  assignedEmployeeId?: number | null;
  status: AssetStatus;
  condition: AssetCondition;
  vendor?: string;
  invoiceNo?: string;
  category?: AssetCategory;
  location?: Location;
  department?: Department;
  assignedEmployee?: Employee;
}

export type MaintenanceStatus =
  | 'reported'
  | 'under_repair'
  | 'repaired'
  | 'reassigned'
  | 'cancelled';

export interface Maintenance {
  id: number;
  assetId: number;
  issue: string;
  status: MaintenanceStatus;
  vendor?: string | null;
  estimatedCost?: string | number | null;
  actualCost?: string | number | null;
  reportedAt: string;
  expectedCompletionDate?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  asset?: Pick<Asset, 'id' | 'assetCode' | 'brand' | 'model' | 'status' | 'assignedEmployeeId'>;
  reportedBy?: { id: number; fullName: string; email: string };
}

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  assetId?: number | null;
  isRead: boolean;
  createdAt: string;
  asset?: { id: number; assetCode: string };
}

export interface SavedView {
  id: number;
  name: string;
  resource: string;
  filters: Record<string, unknown>;
  isShared: boolean;
  createdById: number;
}

export interface ImportJob {
  id: number;
  kind: 'assets' | 'employees';
  filename: string;
  status: 'queued' | 'previewed' | 'running' | 'completed' | 'failed' | 'rolled_back';
  mapping?: Record<string, string> | null;
  totalRows: number;
  createdCount: number;
  updatedCount?: number;
  failedCount: number;
  startedAt?: string | null;
  finishedAt?: string | null;
  duplicateCount: number;
  errors?: { row: number; message: string; code?: string }[] | null;
  preview?: {
    headers?: string[];
    sampleRows?: Record<string, string>[];
    suggestedMapping?: Record<string, string>;
    canonical?: string[];
    duplicates?: { row: number; key: string; value: string; reason: string }[];
  } | null;
  createdAt: string;
}

export interface ReconciliationRun {
  id: number;
  kind: 'employees' | 'assets';
  filename: string;
  matchField: string;
  inFileOnly: number;
  inSystemOnly: number;
  matched: number;
  findings: {
    inFileOnly: { key: string; label: string }[];
    inSystemOnly: { key: string; label: string }[];
  };
  createdAt: string;
}

export interface AssetRequest {
  id: number;
  kind: 'asset' | 'accessory';
  categoryId?: number | null;
  accessoryName?: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  managerComment?: string | null;
  rejectionReason?: string | null;
  requester?: Employee;
  category?: AssetCategory;
  reviewedAt?: string | null;
  fulfilledAt?: string | null;
}

export interface Accessory {
  id: number;
  name: string;
  category: string;
  quantityTotal: number;
  quantityCheckedOut: number;
  quantityAvailable: number;
  checkouts?: {
    id: number;
    quantity: number;
    employee?: Employee;
  }[];
}

export interface Consumable {
  id: number;
  name: string;
  category: string;
  quantityTotal: number;
  quantityAvailable: number;
  lowStockThreshold: number;
  issues?: {
    id: number;
    quantity: number;
    issuedAt: string;
    employee?: Employee;
  }[];
}

export interface AttentionItem {
  type: 'warranty' | 'repair' | 'low_stock' | 'request';
  id: number;
  label: string;
  detail: string;
  href: string;
}

export interface DashboardAttention {
  warrantyUrgent: AttentionItem[];
  staleRepairs: AttentionItem[];
  lowStock: AttentionItem[];
  pendingRequestCount: number;
  toFulfill: AttentionItem[];
}

export interface DashboardMetrics {
  total: number;
  assigned: number;
  available: number;
  underRepair: number;
  retired: number;
  disposed: number;
  lost: number;
  damaged: number;
  pendingAssignment: number;
  warrantyExpiring: number;
  byStatus?: Partial<Record<AssetStatus, number>>;
}

export interface DashboardTrendPoint {
  month: string;
  label: string;
  count: number;
}

export interface LocationBreakdown {
  locationId: number;
  code: string;
  name: string;
  city: string;
  total: number;
}
